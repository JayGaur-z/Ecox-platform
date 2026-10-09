from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, Enum as SAEnum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import sql_enum
from app.models.enums import UserRole
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.badge import UserBadge
    from app.models.carbon_record import CarbonRecord
    from app.models.challenge import Challenge
    from app.models.competition import CompetitionParticipant
    from app.models.submission import Submission


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        sql_enum(UserRole),
        default=UserRole.USER,
        nullable=False,
    )
    eco_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    submissions: Mapped[List["Submission"]] = relationship(
        "Submission",
        back_populates="user",
        foreign_keys="Submission.user_id",
        cascade="all, delete-orphan",
    )
    reviewed_submissions: Mapped[List["Submission"]] = relationship(
        "Submission",
        back_populates="reviewer",
        foreign_keys="Submission.reviewed_by",
    )
    carbon_records: Mapped[List["CarbonRecord"]] = relationship(
        "CarbonRecord",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    user_badges: Mapped[List["UserBadge"]] = relationship(
        "UserBadge",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    competition_participants: Mapped[List["CompetitionParticipant"]] = relationship(
        "CompetitionParticipant",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    created_challenges: Mapped[List["Challenge"]] = relationship(
        "Challenge",
        back_populates="creator",
        foreign_keys="Challenge.created_by",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username} role={self.role}>"
