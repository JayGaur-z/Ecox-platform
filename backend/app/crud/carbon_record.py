from datetime import date
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.carbon_record import CarbonRecord
from app.models.enums import CarbonDirection, CarbonSource, ChallengeCategory


class CRUDCarbonRecord(CRUDBase[CarbonRecord, Any, Any]):
    def __init__(self):
        super().__init__(CarbonRecord)

    async def get_records(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        category: Optional[ChallengeCategory] = None,
        source: Optional[CarbonSource] = None,
        page: int = 1,
        size: int = 50,
    ) -> Tuple[List[CarbonRecord], int]:
        filters = [CarbonRecord.user_id == user_id]
        if date_from:
            filters.append(CarbonRecord.recorded_on >= date_from)
        if date_to:
            filters.append(CarbonRecord.recorded_on <= date_to)
        if category:
            filters.append(CarbonRecord.category == category)
        if source:
            filters.append(CarbonRecord.source == source)

        total_stmt = select(func.count(CarbonRecord.id)).where(*filters)
        total_res = await db.execute(total_stmt)
        total = total_res.scalar() or 0

        offset = (page - 1) * size
        stmt = (
            select(CarbonRecord)
            .where(*filters)
            .order_by(CarbonRecord.recorded_on.desc(), CarbonRecord.id.desc())
            .offset(offset)
            .limit(size)
        )
        res = await db.execute(stmt)
        items = list(res.scalars().all())
        return items, total

    async def get_summary_by_category(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        date_from: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        filters = [CarbonRecord.user_id == user_id]
        if date_from:
            filters.append(CarbonRecord.recorded_on >= date_from)

        stmt = (
            select(
                CarbonRecord.category,
                CarbonRecord.direction,
                func.coalesce(func.sum(CarbonRecord.co2_kg), 0.0).label("total_co2"),
            )
            .where(*filters)
            .group_by(CarbonRecord.category, CarbonRecord.direction)
        )
        res = await db.execute(stmt)
        rows = res.all()

        # Aggregate per category
        category_map: Dict[ChallengeCategory, Dict[str, float]] = {
            cat: {"emissions_kg": 0.0, "savings_kg": 0.0, "net_kg": 0.0}
            for cat in ChallengeCategory
        }

        for category, direction, total_co2 in rows:
            val = float(total_co2)
            if direction == CarbonDirection.EMISSION:
                category_map[category]["emissions_kg"] += val
            else:
                category_map[category]["savings_kg"] += val

        for cat in category_map:
            category_map[cat]["net_kg"] = (
                category_map[cat]["emissions_kg"] - category_map[cat]["savings_kg"]
            )

        return [
            {
                "category": cat,
                "emissions_kg": round(data["emissions_kg"], 2),
                "savings_kg": round(data["savings_kg"], 2),
                "net_kg": round(data["net_kg"], 2),
            }
            for cat, data in category_map.items()
        ]

    async def get_timeseries(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        date_from: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        filters = [CarbonRecord.user_id == user_id]
        if date_from:
            filters.append(CarbonRecord.recorded_on >= date_from)

        stmt = (
            select(
                CarbonRecord.recorded_on,
                CarbonRecord.direction,
                func.coalesce(func.sum(CarbonRecord.co2_kg), 0.0).label("total_co2"),
            )
            .where(*filters)
            .group_by(CarbonRecord.recorded_on, CarbonRecord.direction)
            .order_by(CarbonRecord.recorded_on.asc())
        )
        res = await db.execute(stmt)
        rows = res.all()

        date_map: Dict[date, Dict[str, float]] = {}
        for rec_date, direction, total_co2 in rows:
            if rec_date not in date_map:
                date_map[rec_date] = {"emissions_kg": 0.0, "savings_kg": 0.0}
            val = float(total_co2)
            if direction == CarbonDirection.EMISSION:
                date_map[rec_date]["emissions_kg"] += val
            else:
                date_map[rec_date]["savings_kg"] += val

        timeseries = []
        for rec_date in sorted(date_map.keys()):
            em = date_map[rec_date]["emissions_kg"]
            sa = date_map[rec_date]["savings_kg"]
            timeseries.append(
                {
                    "date": rec_date,
                    "emissions_kg": round(em, 2),
                    "savings_kg": round(sa, 2),
                    "net_kg": round(em - sa, 2),
                }
            )
        return timeseries

    async def get_user_co2_saved(self, db: AsyncSession, user_id: int) -> float:
        stmt = select(func.coalesce(func.sum(CarbonRecord.co2_kg), 0.0)).where(
            CarbonRecord.user_id == user_id,
            CarbonRecord.direction == CarbonDirection.SAVING,
        )
        res = await db.execute(stmt)
        return float(res.scalar_one())


crud_carbon_record = CRUDCarbonRecord()
