from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import SubmissionStatus, VerificationCheckStatus


class SubmissionCreate(BaseModel):
    challenge_id: int
    photo_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_accuracy_m: Optional[float] = None
    captured_at: Optional[datetime] = None
    qr_payload: Optional[str] = None
    evidence_meta: Optional[Dict[str, Any]] = None


class SubmissionReviewRequest(BaseModel):
    decision: SubmissionStatus  # approved, rejected, flagged
    note: Optional[str] = None


class SubmissionVerifyRequest(BaseModel):
    submission_id: int
    decision: SubmissionStatus = SubmissionStatus.APPROVED
    note: Optional[str] = None


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    challenge_id: int
    status: SubmissionStatus
    photo_url: str
    image_url: Optional[str] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gps_accuracy_m: Optional[float] = None
    captured_at: datetime
    qr_payload: Optional[str] = None
    evidence_meta: Optional[Dict[str, Any]] = None
    ai_confidence: Optional[float] = None
    ai_notes: Optional[str] = None
    gps_check: VerificationCheckStatus
    timestamp_check: VerificationCheckStatus
    qr_check: VerificationCheckStatus
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None
    points_awarded: int
    created_at: datetime
    updated_at: datetime

    def model_post_init(self, __context: Any) -> None:
        if self.image_url is None:
            self.image_url = self.photo_url


class EvidenceSummary(BaseModel):
    submission_id: int
    user_id: int
    user_name: Optional[str] = None
    challenge_id: int
    challenge_title: Optional[str] = None
    status: SubmissionStatus
    photo_url: str
    image_url: Optional[str] = None
    is_flagged: bool = False
    flag_reason: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    captured_at: datetime
    gps_check: VerificationCheckStatus
    timestamp_check: VerificationCheckStatus
    qr_check: VerificationCheckStatus
    ai_confidence: Optional[float] = None
    ai_notes: Optional[str] = None
    points_reward: int = 0
    co2_saved_kg: float = 0.0
    reviewed_by: Optional[int] = None
    review_note: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if self.image_url is None:
            self.image_url = self.photo_url
