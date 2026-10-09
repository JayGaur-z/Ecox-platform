from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import BadgeCriteriaType


class BadgeBase(BaseModel):
    code: str
    name: str
    description: str
    icon_url: Optional[str] = None
    criteria_type: BadgeCriteriaType
    criteria_value: float


class BadgeCreate(BadgeBase):
    pass


class BadgeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    criteria_type: Optional[BadgeCriteriaType] = None
    criteria_value: Optional[float] = None


class BadgeRead(BadgeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class UserBadgeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    badge: BadgeRead
    awarded_at: datetime
    awarded_for_submission_id: Optional[int] = None
