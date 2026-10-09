from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column

from app.db.types import UTCDateTime


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    """
    Mixin that provides UTC timezone-aware created_at and updated_at timestamps.
    """

    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=utc_now,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
