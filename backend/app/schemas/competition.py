from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import CompetitionMetric, CompetitionStatus
from app.schemas.user import UserRead


class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rank: int
    id: int
    name: str
    username: str
    college: Optional[str] = "TCET Mumbai"
    eco_points: int
    co2_saved_kg: float = 0.0
    challenges_completed: int = 0


class CompetitionBase(BaseModel):
    name: str
    description: str
    starts_at: datetime
    ends_at: datetime
    scoring_metric: CompetitionMetric


class CompetitionCreate(CompetitionBase):
    pass


class CompetitionRead(CompetitionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: CompetitionStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
