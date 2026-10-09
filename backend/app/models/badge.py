from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import UTCDateTime, sql_enum
from app.models.enums import BadgeCriteriaType
from app.models.mixins import TimestampMixin, utc_now

if TYPE_CHECKING:
    from app.models.submission import Submission
    from app.models.user import User


class Badge(Base, TimestampMixin):
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    criteria_type: Mapped[BadgeCriteriaType] = mapped_column(
        sql_enum(BadgeCriteriaType),
        nullable=False,
    )
    criteria_value: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    user_badges: Mapped[List["UserBadge"]] = relationship(
        "UserBadge",
        back_populates="badge",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Badge id={self.id} code={self.code} name={self.name}>"


class UserBadge(Base, TimestampMixin):
    __tablename__ = "user_badges"

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    badge_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("badges.id", ondelete="CASCADE"),
        primary_key=True,
    )
    awarded_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=utc_now,
        nullable=False,
    )
    awarded_for_submission_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("submissions.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="user_badges",
        foreign_keys=[user_id],
    )
    badge: Mapped["Badge"] = relationship(
        "Badge",
        back_populates="user_badges",
        foreign_keys=[badge_id],
    )
    awarded_for_submission: Mapped[Optional["Submission"]] = relationship(
        "Submission",
        foreign_keys=[awarded_for_submission_id],
    )

    def __repr__(self) -> str:
        return f"<UserBadge user_id={self.user_id} badge_id={self.badge_id}>"
