from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.carbon_record import CarbonRecord
from app.models.enums import CarbonSource, ChallengeCategory
from app.models.user import User
from app.schemas.carbon import (
    CarbonRecordCreate,
    CarbonRecordRead,
    CarbonSummary,
    CarbonTimeseriesPoint,
)
from app.schemas.common import Page
from app.services.carbon_service import carbon_service

router = APIRouter(prefix="/carbon", tags=["Carbon"])


@router.get(
    "/reduction-plan",
    status_code=status.HTTP_200_OK,
    summary="Get tailored reduction plan based on user's actual carbon records and diet type",
)
async def get_reduction_plan(
    diet: Optional[str] = Query(None, description="Optional explicit diet type override"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Dynamic reduction planner logic:
    - Inspects user's latest carbon records & diet type.
    - If diet_type is vegetarian or vegan, NEVER outputs 'eat less meat' or 'meatless Mondays'.
      Outputs targeted actions: local seasonal procurement, composting food waste,
      energy-efficient induction cooking, and bulk storage.
    - Tailors transport and energy recommendations strictly to highest emission categories.
    """
    stmt = (
        select(CarbonRecord)
        .where(CarbonRecord.user_id == current_user.id)
        .order_by(CarbonRecord.recorded_on.desc(), CarbonRecord.id.desc())
    )
    res = await db.execute(stmt)
    records = list(res.scalars().all())

    category_totals = {"transport": 0.0, "energy": 0.0, "food": 0.0, "waste": 0.0}
    detected_diet = diet.lower().strip() if diet else None

    for r in records:
        cat_key = r.category.value.lower()
        if cat_key in category_totals:
            category_totals[cat_key] += r.co2_kg

        if not detected_diet:
            act = r.activity_type.lower()
            if "vegan" in act:
                detected_diet = "vegan"
            elif "vegetarian" in act or "veggie" in act:
                detected_diet = "vegetarian"
            elif "meat" in act or "beef" in act or "pork" in act:
                detected_diet = "mixed"

    if not detected_diet:
        detected_diet = "mixed"

    sorted_cats = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    highest_category = sorted_cats[0][0] if sorted_cats and sorted_cats[0][1] > 0 else "transport"

    suggestions = []

    # Tailor transport & energy according to highest emissions
    if category_totals["transport"] >= category_totals["energy"]:
        suggestions.append({
            "category": "Transport",
            "emoji": "🚍",
            "title": "Shift to Mass Transit & Rail",
            "potentialReduction": 8.4,
            "action": "Replace 2–3 solo motor vehicle trips per week with electric bus or metro rail.",
            "challengeId": "1",
        })
        suggestions.append({
            "category": "Transport",
            "emoji": "🚲",
            "title": "Active Zero-Emission Cycling",
            "potentialReduction": 5.2,
            "action": "Pedal or walk for campus and neighborhood trips under 3 km.",
            "challengeId": "6",
        })
        suggestions.append({
            "category": "Energy",
            "emoji": "💡",
            "title": "Vampire Power & LED Switch",
            "potentialReduction": 4.5,
            "action": "Turn off power strips and switch legacy bulbs to high-efficiency LEDs.",
            "challengeId": "4",
        })
    else:
        suggestions.append({
            "category": "Energy",
            "emoji": "⚡",
            "title": "Optimize Heating, Cooling & Baseline Power",
            "potentialReduction": 8.0,
            "action": "Set air conditioning to 24°C+, eliminate standby phantom power loads, and switch to star-rated appliances.",
            "challengeId": "4",
        })
        suggestions.append({
            "category": "Transport",
            "emoji": "🚍",
            "title": "Public & Shared Commute",
            "potentialReduction": 6.2,
            "action": "Utilize university transit shuttles or carpool for daily commuting.",
            "challengeId": "1",
        })

    # Targeted Food logic
    if detected_diet in ("vegetarian", "vegan"):
        suggestions.append({
            "category": "Food",
            "emoji": "🥬",
            "title": "Local Seasonal Procurement",
            "potentialReduction": 4.0,
            "action": "Source fresh seasonal produce from local growers within 50 km to slash long-distance refrigerated freight emissions.",
            "challengeId": "5",
        })
        suggestions.append({
            "category": "Waste",
            "emoji": "🌱",
            "title": "Compost Organic Food Scraps",
            "potentialReduction": 3.4,
            "action": "Compost all vegetable peels, fruit rinds, and organic food scraps to prevent anaerobic methane release in landfills.",
            "challengeId": "3",
        })
        suggestions.append({
            "category": "Energy",
            "emoji": "🍲",
            "title": "Energy-Efficient Induction Cooking",
            "potentialReduction": 2.8,
            "action": "Adopt magnetic induction cooktops and thermal pressure pots over open gas burners.",
            "challengeId": "4",
        })
        suggestions.append({
            "category": "Waste",
            "emoji": "📦",
            "title": "Bulk Storage & Minimal Packaging",
            "potentialReduction": 2.2,
            "action": "Procure dry legumes, grains, and kitchen staples in bulk to eliminate single-use plastic packaging and freight.",
            "challengeId": "3",
        })
    else:
        suggestions.append({
            "category": "Food",
            "emoji": "🥗",
            "title": "Plant-Forward Meals & Meat Reduction",
            "potentialReduction": 5.5,
            "action": "Replace 2–3 meat-heavy meals weekly with protein-dense legumes, beans, and whole grains.",
            "challengeId": "5",
        })

    # Always include Tree Planting / Nature
    suggestions.append({
        "category": "Nature",
        "emoji": "🌳",
        "title": "Plant a Native Tree",
        "potentialReduction": 5.0,
        "action": "A single native sapling sequesters up to 21 kg CO₂ annually once matured.",
        "challengeId": "2",
    })

    total_possible = round(sum(s["potentialReduction"] for s in suggestions), 1)

    return {
        "diet_type": detected_diet,
        "highest_category": highest_category,
        "category_totals": category_totals,
        "total_possible_reduction": total_possible,
        "suggestions": suggestions,
    }


@router.post(
    "/records",
    response_model=CarbonRecordRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a self-reported carbon entry with auto-calculated CO2",
)
async def create_carbon_record(
    record_in: CarbonRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CarbonRecordRead:
    record = await carbon_service.create_self_reported(
        db,
        user_id=current_user.id,
        record_in=record_in,
    )
    return CarbonRecordRead.model_validate(record)


@router.get(
    "/records",
    response_model=Page[CarbonRecordRead],
    status_code=status.HTTP_200_OK,
    summary="List the authenticated user's carbon records with filters",
)
async def list_carbon_records(
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    category: Optional[ChallengeCategory] = Query(None, description="Filter by category"),
    source: Optional[CarbonSource] = Query(None, description="Filter by source"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size (max 100)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Page[CarbonRecordRead]:
    items, total = await carbon_service.list_records(
        db,
        user_id=current_user.id,
        date_from=date_from,
        date_to=date_to,
        category=category,
        source=source,
        page=page,
        size=size,
    )
    models = [CarbonRecordRead.model_validate(item) for item in items]
    return Page.create(items=models, total=total, page=page, size=size)


@router.get(
    "/summary",
    response_model=CarbonSummary,
    status_code=status.HTTP_200_OK,
    summary="Get aggregated carbon summary grouped by category and period",
)
async def get_carbon_summary(
    period: str = Query("month", description="Aggregation period: week, month, year, all"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CarbonSummary:
    return await carbon_service.get_summary(
        db,
        user_id=current_user.id,
        period=period,
    )


@router.get(
    "/timeseries",
    response_model=List[CarbonTimeseriesPoint],
    status_code=status.HTTP_200_OK,
    summary="Get timeseries carbon data for trend charts",
)
async def get_carbon_timeseries(
    period: str = Query("month", description="Timeseries period: week, month, year, all"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[CarbonTimeseriesPoint]:
    timeseries_data = await carbon_service.get_timeseries(
        db,
        user_id=current_user.id,
        period=period,
    )
    return [CarbonTimeseriesPoint(**item) for item in timeseries_data]


@router.delete(
    "/records/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a self-reported carbon record (Owner only)",
)
async def delete_carbon_record(
    record_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await carbon_service.delete_record(
        db,
        user_id=current_user.id,
        record_id=record_id,
    )
