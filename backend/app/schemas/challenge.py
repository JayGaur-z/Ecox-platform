from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ChallengeCategory, ChallengeDifficulty


class VerificationRequirements(BaseModel):
    photo: bool = True
    gps: bool = False
    qr: bool = False
    timestamp: bool = True
    expected_lat: Optional[float] = None
    expected_lng: Optional[float] = None
    radius_m: Optional[float] = None
    expected_qr: Optional[str] = None


class ChallengeBase(BaseModel):
    title: str = Field(..., max_length=150)
    description: str
    category: ChallengeCategory
    points_reward: int = Field(..., ge=0)
    co2_saved_kg: float = Field(..., ge=0.0)
    verification_requirements: VerificationRequirements = Field(default_factory=VerificationRequirements)
    difficulty: ChallengeDifficulty
    is_active: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class ChallengeCreate(ChallengeBase):
    pass


class ChallengeUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    category: Optional[ChallengeCategory] = None
    points_reward: Optional[int] = Field(None, ge=0)
    co2_saved_kg: Optional[float] = Field(None, ge=0.0)
    verification_requirements: Optional[VerificationRequirements] = None
    difficulty: Optional[ChallengeDifficulty] = None
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class ChallengeRead(ChallengeBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
