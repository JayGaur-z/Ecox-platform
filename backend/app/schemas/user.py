from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.enums import UserRole


class UserBase(BaseModel):
    email: str
    username: str
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None


class UserAdminUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserRead(BaseModel):
    id: int
    email: str
    username: str
    role: UserRole
    eco_points: int
    is_active: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserStats(BaseModel):
    eco_points: int
    co2_saved_kg: float
    rank: int
    badge_count: int
    completed_challenges_count: int = 0
    challenges_completed: int = 0
