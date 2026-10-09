from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import Boolean, Enum as SAEnum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import UTCDateTime, sql_enum
from app.models.enums import ChallengeCategory, ChallengeDifficulty
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.competition import CompetitionChallenge
    from app.models.submission import Submission
    from app.models.user import User


class Challenge(Base, TimestampMixin):
    __tablename__ = "challenges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[ChallengeCategory] = mapped_column(
        sql_enum(ChallengeCategory),
        nullable=False,
    )
    points_reward: Mapped[int] = mapped_column(Integer, nullable=False)
    co2_saved_kg: Mapped[float] = mapped_column(Float, nullable=False)
    verification_requirements: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )
    difficulty: Mapped[ChallengeDifficulty] = mapped_column(
        sql_enum(ChallengeDifficulty),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    starts_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    ends_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime(), nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    creator: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="created_challenges",
        foreign_keys=[created_by],
    )
    submissions: Mapped[List["Submission"]] = relationship(
        "Submission",
        back_populates="challenge",
        cascade="all, delete-orphan",
    )
    competition_challenges: Mapped[List["CompetitionChallenge"]] = relationship(
        "CompetitionChallenge",
        back_populates="challenge",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Challenge id={self.id} title={self.title} category={self.category}>"
