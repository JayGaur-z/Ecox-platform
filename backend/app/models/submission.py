from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional
from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import UTCDateTime, sql_enum
from app.models.enums import SubmissionStatus, VerificationCheckStatus
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.carbon_record import CarbonRecord
    from app.models.challenge import Challenge
    from app.models.user import User


class Submission(Base, TimestampMixin):
    __tablename__ = "submissions"
    __table_args__ = (
        UniqueConstraint("user_id", "challenge_id", "captured_at", name="uq_submission_user_challenge_captured"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    challenge_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("challenges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[SubmissionStatus] = mapped_column(
        sql_enum(SubmissionStatus),
        default=SubmissionStatus.PENDING_REVIEW,
        index=True,
        nullable=False,
    )
    photo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    flag_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gps_accuracy_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    captured_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    qr_payload: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    evidence_meta: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    gps_check: Mapped[VerificationCheckStatus] = mapped_column(
        sql_enum(VerificationCheckStatus),
        default=VerificationCheckStatus.SKIPPED,
        nullable=False,
    )
    timestamp_check: Mapped[VerificationCheckStatus] = mapped_column(
        sql_enum(VerificationCheckStatus),
        default=VerificationCheckStatus.SKIPPED,
        nullable=False,
    )
    qr_check: Mapped[VerificationCheckStatus] = mapped_column(
        sql_enum(VerificationCheckStatus),
        default=VerificationCheckStatus.SKIPPED,
        nullable=False,
    )

    reviewed_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    points_awarded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="submissions",
        foreign_keys=[user_id],
    )
    challenge: Mapped["Challenge"] = relationship(
        "Challenge",
        back_populates="submissions",
        foreign_keys=[challenge_id],
    )
    reviewer: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="reviewed_submissions",
        foreign_keys=[reviewed_by],
    )
    carbon_record: Mapped[Optional["CarbonRecord"]] = relationship(
        "CarbonRecord",
        back_populates="submission",
        uselist=False,
    )

    @property
    def image_url(self) -> str:
        return self.photo_url

    def __repr__(self) -> str:
        return f"<Submission id={self.id} user_id={self.user_id} challenge_id={self.challenge_id} status={self.status}>"
