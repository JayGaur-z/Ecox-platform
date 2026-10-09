from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.enums import SubmissionStatus, VerificationCheckStatus
from app.models.submission import Submission
from app.schemas.submission import SubmissionCreate


class CRUDSubmission(CRUDBase[Submission, SubmissionCreate, Dict[str, Any]]):
    async def get_with_details(self, db: AsyncSession, id: int) -> Optional[Submission]:
        stmt = (
            select(Submission)
            .where(Submission.id == id)
            .options(
                selectinload(Submission.user),
                selectinload(Submission.challenge),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        status: Optional[SubmissionStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Submission]:
        stmt = (
            select(Submission)
            .where(Submission.user_id == user_id)
            .options(
                selectinload(Submission.challenge),
            )
        )
        if status:
            if status in (SubmissionStatus.PENDING_REVIEW, "PENDING_REVIEW", "pending"):
                stmt = stmt.where(Submission.status == SubmissionStatus.PENDING_REVIEW)
            elif status in (SubmissionStatus.APPROVED, "APPROVED", "approved"):
                stmt = stmt.where(Submission.status == SubmissionStatus.APPROVED)
            elif status in (SubmissionStatus.REJECTED, "REJECTED", "rejected"):
                stmt = stmt.where(Submission.status == SubmissionStatus.REJECTED)
            else:
                stmt = stmt.where(Submission.status == status)
        stmt = stmt.order_by(Submission.captured_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_multi_admin(
        self,
        db: AsyncSession,
        status: Optional[SubmissionStatus] = None,
        challenge_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Submission]:
        stmt = select(Submission).options(
            selectinload(Submission.user),
            selectinload(Submission.challenge),
        )
        if status:
            if status in (SubmissionStatus.PENDING_REVIEW, "PENDING_REVIEW", "pending"):
                stmt = stmt.where(Submission.status == SubmissionStatus.PENDING_REVIEW)
            elif status in (SubmissionStatus.APPROVED, "APPROVED", "approved"):
                stmt = stmt.where(Submission.status == SubmissionStatus.APPROVED)
            elif status in (SubmissionStatus.REJECTED, "REJECTED", "rejected"):
                stmt = stmt.where(Submission.status == SubmissionStatus.REJECTED)
            else:
                stmt = stmt.where(Submission.status == status)
        if challenge_id:
            stmt = stmt.where(Submission.challenge_id == challenge_id)

        # Flagged first, then pending/review, then created_at desc
        stmt = stmt.order_by(
            Submission.is_flagged.desc(),
            Submission.created_at.desc(),
        ).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def count_user_approved(self, db: AsyncSession, user_id: int) -> int:
        stmt = select(func.count(Submission.id)).where(
            Submission.user_id == user_id,
            Submission.status == SubmissionStatus.APPROVED,
        )
        result = await db.execute(stmt)
        return result.scalar_one() or 0


crud_submission = CRUDSubmission(Submission)
