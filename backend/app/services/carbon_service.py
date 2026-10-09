from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.crud.carbon_record import crud_carbon_record
from app.models.carbon_record import CarbonRecord
from app.models.enums import CarbonDirection, CarbonSource, ChallengeCategory
from app.schemas.carbon import CarbonRecordCreate, CarbonSummary, CategoryTotal
from app.services.carbon_calculator import calculate_co2


class CarbonService:
    async def create_self_reported(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        record_in: CarbonRecordCreate,
    ) -> CarbonRecord:
        co2_kg = calculate_co2(
            category=record_in.category,
            activity_type=record_in.activity_type,
            quantity=record_in.quantity,
            unit=record_in.unit,
        )

        record_data = {
            "user_id": user_id,
            "submission_id": None,
            "source": CarbonSource.SELF_REPORTED,
            "category": record_in.category,
            "activity_type": record_in.activity_type,
            "quantity": record_in.quantity,
            "unit": record_in.unit,
            "co2_kg": co2_kg,
            "direction": CarbonDirection.EMISSION,
            "recorded_on": record_in.recorded_on or date.today(),
        }
        return await crud_carbon_record.create(db, obj_in=record_data)

    async def list_records(
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
        return await crud_carbon_record.get_records(
            db,
            user_id=user_id,
            date_from=date_from,
            date_to=date_to,
            category=category,
            source=source,
            page=page,
            size=size,
        )

    async def get_summary(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        period: str = "month",
    ) -> CarbonSummary:
        date_from = self._resolve_period_start(period)
        by_category_data = await crud_carbon_record.get_summary_by_category(
            db, user_id=user_id, date_from=date_from
        )

        total_emissions = sum(item["emissions_kg"] for item in by_category_data)
        total_savings = sum(item["savings_kg"] for item in by_category_data)
        net_co2 = total_emissions - total_savings

        by_cat_models = [
            CategoryTotal(
                category=item["category"],
                emissions_kg=item["emissions_kg"],
                savings_kg=item["savings_kg"],
                net_kg=item["net_kg"],
            )
            for item in by_category_data
        ]

        return CarbonSummary(
            period=period,
            total_emissions_kg=round(total_emissions, 2),
            total_savings_kg=round(total_savings, 2),
            net_co2_kg=round(net_co2, 2),
            by_category=by_cat_models,
        )

    async def get_timeseries(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        period: str = "month",
    ) -> List[Dict[str, Any]]:
        date_from = self._resolve_period_start(period)
        return await crud_carbon_record.get_timeseries(
            db, user_id=user_id, date_from=date_from
        )

    async def delete_record(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        record_id: int,
    ) -> None:
        record = await crud_carbon_record.get(db, record_id)
        # Ownership check: return 404 rather than 403 for other users' resources (rule 6)
        if not record or record.user_id != user_id:
            raise NotFoundException(detail="Carbon record not found", code="RECORD_NOT_FOUND")

        if record.source != CarbonSource.SELF_REPORTED:
            raise BadRequestException(
                detail="Only self-reported carbon records can be deleted",
                code="CANNOT_DELETE_VERIFIED_RECORD",
            )

        await crud_carbon_record.remove(db, id=record_id)

    def _resolve_period_start(self, period: str) -> Optional[date]:
        today = date.today()
        p = period.lower().strip()
        if p == "week":
            return today - timedelta(days=7)
        elif p == "month":
            return today - timedelta(days=30)
        elif p == "year":
            return today - timedelta(days=365)
        elif p == "all":
            return None
        return today - timedelta(days=30)


carbon_service = CarbonService()
