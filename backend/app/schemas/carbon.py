from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CarbonDirection, CarbonSource, ChallengeCategory


class CarbonRecordCreate(BaseModel):
    category: ChallengeCategory
    activity_type: str = Field(..., max_length=100)
    quantity: float = Field(..., gt=0.0, description="Amount of activity, e.g. distance in km or electricity in kWh")
    unit: str = Field(..., max_length=20, description="Unit of measurement, e.g. km, kwh, kg")
    recorded_on: Optional[date] = Field(default_factory=date.today)


class CarbonRecordRead(BaseModel):
    id: int
    user_id: int
    submission_id: Optional[int] = None
    source: CarbonSource
    category: ChallengeCategory
    activity_type: str
    quantity: float
    unit: str
    co2_kg: float
    direction: CarbonDirection
    recorded_on: date
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryTotal(BaseModel):
    category: ChallengeCategory
    emissions_kg: float = 0.0
    savings_kg: float = 0.0
    net_kg: float = 0.0


class CarbonSummary(BaseModel):
    period: str
    total_emissions_kg: float
    total_savings_kg: float
    net_co2_kg: float
    by_category: List[CategoryTotal]


class CarbonTimeseriesPoint(BaseModel):
    date: date
    emissions_kg: float = 0.0
    savings_kg: float = 0.0
    net_kg: float = 0.0
