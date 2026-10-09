from datetime import datetime, timezone
import enum
from typing import Type
from sqlalchemy import DateTime, Enum as SAEnum, TypeDecorator


class UTCDateTime(TypeDecorator):
    """
    Platform-independent DateTime type that ensures values are stored in UTC
    and returned as timezone-aware UTC datetime objects across SQLite, MySQL, and Postgres.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is not None:
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            else:
                value = value.astimezone(timezone.utc)
        return value

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is not None:
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            else:
                value = value.astimezone(timezone.utc)
        return value


def sql_enum(enum_cls: Type[enum.Enum]) -> SAEnum:
    """
    Returns an SQLAlchemy Enum configured to store string values
    instead of Python Enum member names, with native_enum=False for seamless
    cross-database portability between SQLite and MySQL.
    """
    return SAEnum(
        enum_cls,
        native_enum=False,
        values_callable=lambda obj: [item.value for item in obj],
        validate_strings=True,
    )
