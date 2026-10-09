import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_admin
from app.core.exceptions import BadRequestException, NotFoundException
from app.crud.challenge import crud_challenge
from app.crud.submission import crud_submission
from app.models.enums import SubmissionStatus, UserRole
from app.models.submission import Submission
from app.models.user import User
from app.schemas.submission import (
    EvidenceSummary,
    SubmissionCreate,
    SubmissionRead,
    SubmissionVerifyRequest,
)
from app.services.reward import reward_service
from app.services.verification import verification_service

router = APIRouter(prefix="/submissions", tags=["Submissions"])


@router.post("", response_model=SubmissionRead, status_code=status.HTTP_201_CREATED)
async def create_submission(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubmissionRead:
    """
    Submit evidence for an active challenge.
    Supports multipart/form-data with actual file upload and Pillow EXIF verification,
    as well as JSON payloads for automated integration.
    """
    content_type = request.headers.get("content-type", "")
    challenge_id: Optional[int] = None
    photo_url: str = "/uploads/default_proof.jpg"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_accuracy_m: Optional[float] = None
    captured_at: datetime = datetime.now(timezone.utc)
    qr_payload: Optional[str] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    evidence_meta: Optional[dict] = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        ch_id_val = form.get("challenge_id")
        if not ch_id_val:
            raise BadRequestException(
                detail="challenge_id is required",
                code="MISSING_CHALLENGE_ID",
            )
        try:
            challenge_id = int(str(ch_id_val))
        except ValueError:
            raise BadRequestException(detail="challenge_id must be an integer", code="INVALID_CHALLENGE_ID")

        uploaded_file = form.get("file") or form.get("image") or form.get("photo")
        if uploaded_file and hasattr(uploaded_file, "read"):
            file_bytes = await uploaded_file.read()
            # 1. & 2. & 3. Extract EXIF metadata and compare timestamp against server UTC now
            exif_res = verification_service.extract_and_validate_exif(file_bytes)
            is_flagged = exif_res["is_flagged"]
            flag_reason = exif_res["flag_reason"]
            captured_at = exif_res["captured_at"]
            if exif_res["latitude"] is not None:
                latitude = exif_res["latitude"]
            if exif_res["longitude"] is not None:
                longitude = exif_res["longitude"]

            # 4. Save actual physical image file to backend/uploads/ with unique UUID filename
            original_fn = getattr(uploaded_file, "filename", "proof.jpg") or "proof.jpg"
            ext = os.path.splitext(original_fn)[1] or ".jpg"
            if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                ext = ".jpg"
            filename = f"{uuid.uuid4()}{ext}"

            backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            uploads_dir = os.path.join(backend_root, "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            file_path = os.path.join(uploads_dir, filename)

            with open(file_path, "wb") as f:
                f.write(file_bytes)

            photo_url = f"/uploads/{filename}"
            evidence_meta = {
                "original_filename": original_fn,
                "saved_filename": filename,
                "file_size": len(file_bytes),
                "exif_found": exif_res["exif_found"],
            }
        else:
            is_flagged = True
            flag_reason = "Photo taken >2 hours ago or metadata stripped (possible old photo or screenshot)"
            photo_url = str(form.get("photo_url") or "/uploads/default_proof.jpg")

        if form.get("latitude"):
            try:
                latitude = float(form.get("latitude"))
            except ValueError:
                pass
        if form.get("longitude"):
            try:
                longitude = float(form.get("longitude"))
            except ValueError:
                pass
        if form.get("gps_accuracy_m"):
            try:
                gps_accuracy_m = float(form.get("gps_accuracy_m"))
            except ValueError:
                pass
        qr_payload = form.get("qr_payload")
    else:
        # JSON payload for test/backward-compatibility
        body = await request.json()
        sub_in = SubmissionCreate(**body)
        challenge_id = sub_in.challenge_id
        photo_url = sub_in.photo_url or "/uploads/default_proof.jpg"
        latitude = sub_in.latitude
        longitude = sub_in.longitude
        gps_accuracy_m = sub_in.gps_accuracy_m
        captured_at = sub_in.captured_at or datetime.now(timezone.utc)
        qr_payload = sub_in.qr_payload
        evidence_meta = sub_in.evidence_meta
        # When passing raw URL without EXIF, mark flagged for admin visibility
        is_flagged = True
        flag_reason = "Photo taken >2 hours ago or metadata stripped (possible old photo or screenshot)"

    challenge = await crud_challenge.get(db, challenge_id)
    if not challenge or not challenge.is_active:
        raise BadRequestException(
            detail="Challenge does not exist or is not currently active",
            code="CHALLENGE_INACTIVE",
        )

    gps_check = verification_service.check_gps(
        latitude, longitude, gps_accuracy_m, challenge
    )
    timestamp_check = verification_service.check_timestamp(captured_at, challenge)
    qr_check = verification_service.check_qr(qr_payload, challenge)
    ai_conf, ai_notes = verification_service.check_ai(photo_url, challenge)

    new_sub = Submission(
        user_id=current_user.id,
        challenge_id=challenge.id,
        status=SubmissionStatus.PENDING_REVIEW,
        photo_url=photo_url,
        is_flagged=is_flagged,
        flag_reason=flag_reason,
        latitude=latitude,
        longitude=longitude,
        gps_accuracy_m=gps_accuracy_m,
        captured_at=captured_at,
        qr_payload=qr_payload,
        evidence_meta=evidence_meta,
        ai_confidence=ai_conf,
        ai_notes=ai_notes,
        gps_check=gps_check,
        timestamp_check=timestamp_check,
        qr_check=qr_check,
        points_awarded=0,
    )

    db.add(new_sub)
    await db.commit()
    await db.refresh(new_sub)
    return SubmissionRead.model_validate(new_sub)


@router.post("/verify", response_model=SubmissionRead)
async def verify_submission(
    verify_in: SubmissionVerifyRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> SubmissionRead:
    """
    Admin only: review and verify, reject, or flag a user submission.
    """
    if verify_in.decision in (SubmissionStatus.APPROVED, "APPROVED", "approved"):
        sub = await reward_service.approve_submission(
            db,
            submission_id=verify_in.submission_id,
            reviewer_id=current_admin.id,
            review_note=verify_in.note,
        )
        return SubmissionRead.model_validate(sub)

    sub = await crud_submission.get(db, verify_in.submission_id)
    if not sub:
        raise NotFoundException(
            detail=f"Submission {verify_in.submission_id} not found",
            code="SUBMISSION_NOT_FOUND",
        )

    sub.status = verify_in.decision
    sub.reviewed_by = current_admin.id
    sub.reviewed_at = datetime.now(timezone.utc)
    sub.review_note = verify_in.note
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return SubmissionRead.model_validate(sub)


@router.get("/me", response_model=List[SubmissionRead])
async def list_my_submissions(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SubmissionRead]:
    """
    List submissions made by the currently authenticated user.
    """
    parsed_status = None
    if status_filter:
        try:
            parsed_status = SubmissionStatus(status_filter)
        except Exception:
            parsed_status = status_filter

    subs = await crud_submission.get_multi_by_user(
        db,
        user_id=current_user.id,
        status=parsed_status,
        skip=skip,
        limit=limit,
    )
    return [SubmissionRead.model_validate(s) for s in subs]


@router.get("", response_model=List[SubmissionRead])
async def list_submissions_admin(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    challenge_id: Optional[int] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> List[SubmissionRead]:
    """
    Admin only: review queue of all submissions.
    """
    parsed_status = None
    if status_filter:
        try:
            parsed_status = SubmissionStatus(status_filter)
        except Exception:
            parsed_status = status_filter

    subs = await crud_submission.get_multi_admin(
        db,
        status=parsed_status,
        challenge_id=challenge_id,
        skip=skip,
        limit=limit,
    )
    return [SubmissionRead.model_validate(s) for s in subs]


@router.get("/{id}", response_model=EvidenceSummary)
async def get_submission_detail(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EvidenceSummary:
    """
    Get full evidence summary for a submission.
    Accessible only by the submission owner or an admin.
    """
    sub = await crud_submission.get_with_details(db, id)
    if not sub:
        raise NotFoundException(
            detail=f"Submission {id} not found",
            code="SUBMISSION_NOT_FOUND",
        )

    if sub.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise NotFoundException(
            detail=f"Submission {id} not found",
            code="SUBMISSION_NOT_FOUND",
        )

    return EvidenceSummary(
        submission_id=sub.id,
        user_id=sub.user_id,
        user_name=sub.user.username if sub.user else None,
        challenge_id=sub.challenge_id,
        challenge_title=sub.challenge.title if sub.challenge else None,
        status=sub.status,
        photo_url=sub.photo_url,
        latitude=sub.latitude,
        longitude=sub.longitude,
        captured_at=sub.captured_at,
        gps_check=sub.gps_check,
        timestamp_check=sub.timestamp_check,
        qr_check=sub.qr_check,
        ai_confidence=sub.ai_confidence,
        ai_notes=sub.ai_notes,
        points_reward=sub.challenge.points_reward if sub.challenge else 0,
        co2_saved_kg=sub.challenge.co2_saved_kg if sub.challenge else 0.0,
        reviewed_by=sub.reviewed_by,
        review_note=sub.review_note,
    )
