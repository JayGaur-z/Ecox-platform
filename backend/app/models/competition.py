from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import UTCDateTime, sql_enum
from app.models.enums import CompetitionMetric, CompetitionStatus
from app.models.mixins import TimestampMixin, utc_now

if TYPE_CHECKING:
    from app.models.challenge import Challenge
    from app.models.user import User


class Competition(Base, TimestampMixin):
    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    scoring_metric: Mapped[CompetitionMetric] = mapped_column(
        sql_enum(CompetitionMetric),
        nullable=False,
    )
    status: Mapped[CompetitionStatus] = mapped_column(
        sql_enum(CompetitionStatus),
        default=CompetitionStatus.UPCOMING,
        nullable=False,
    )
    created_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    creator: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[created_by],
    )
    participants: Mapped[List["CompetitionParticipant"]] = relationship(
        "CompetitionParticipant",
        back_populates="competition",
        cascade="all, delete-orphan",
    )
    competition_challenges: Mapped[List["CompetitionChallenge"]] = relationship(
        "CompetitionChallenge",
        back_populates="competition",
        cascade="all, delete-orphan",
    )

    @property
    def computed_status(self) -> CompetitionStatus:
        """
        Dynamically computes current status based on UTC current time.
        """
        now = datetime.now(timezone.utc)
        if self.starts_at.tzinfo is None:
            # Handle naive datetime comparison safely if needed
            now_dt = datetime.now()
        else:
            now_dt = now

        if now_dt < self.starts_at:
            return CompetitionStatus.UPCOMING
        elif now_dt > self.ends_at:
            return CompetitionStatus.FINISHED
        return CompetitionStatus.ACTIVE

    def __repr__(self) -> str:
        return f"<Competition id={self.id} name={self.name} metric={self.scoring_metric}>"


class CompetitionParticipant(Base, TimestampMixin):
    __tablename__ = "competition_participants"

    competition_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("competitions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    joined_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=utc_now,
        nullable=False,
    )
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    competition: Mapped["Competition"] = relationship(
        "Competition",
        back_populates="participants",
        foreign_keys=[competition_id],
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="competition_participants",
        foreign_keys=[user_id],
    )

    def __repr__(self) -> str:
        return f"<CompetitionParticipant competition_id={self.competition_id} user_id={self.user_id} score={self.score}>"


class CompetitionChallenge(Base, TimestampMixin):
    __tablename__ = "competition_challenges"

    competition_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("competitions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    challenge_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("challenges.id", ondelete="CASCADE"),
        primary_key=True,
    )

    # Relationships
    competition: Mapped["Competition"] = relationship(
        "Competition",
        back_populates="competition_challenges",
        foreign_keys=[competition_id],
    )
    challenge: Mapped["Challenge"] = relationship(
        "Challenge",
        back_populates="competition_challenges",
        foreign_keys=[challenge_id],
    )

    def __repr__(self) -> str:
        return f"<CompetitionChallenge competition_id={self.competition_id} challenge_id={self.challenge_id}>"
