from datetime import date
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Date, Enum as SAEnum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import sql_enum
from app.models.enums import CarbonDirection, CarbonSource, ChallengeCategory
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.submission import Submission
    from app.models.user import User


class CarbonRecord(Base, TimestampMixin):
    __tablename__ = "carbon_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    submission_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("submissions.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
        index=True,
    )
    source: Mapped[CarbonSource] = mapped_column(
        sql_enum(CarbonSource),
        nullable=False,
    )
    category: Mapped[ChallengeCategory] = mapped_column(
        sql_enum(ChallengeCategory),
        nullable=False,
    )
    activity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    co2_kg: Mapped[float] = mapped_column(Float, nullable=False)
    direction: Mapped[CarbonDirection] = mapped_column(
        sql_enum(CarbonDirection),
        nullable=False,
    )
    recorded_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="carbon_records",
        foreign_keys=[user_id],
    )
    submission: Mapped[Optional["Submission"]] = relationship(
        "Submission",
        back_populates="carbon_record",
        foreign_keys=[submission_id],
    )

    def __repr__(self) -> str:
        return f"<CarbonRecord id={self.id} user_id={self.user_id} activity={self.activity_type} co2_kg={self.co2_kg}>"
