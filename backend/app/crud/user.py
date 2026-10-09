from typing import Any, Dict, List, Optional, Tuple, Union
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.badge import UserBadge
from app.models.carbon_record import CarbonRecord
from app.models.enums import CarbonDirection, SubmissionStatus
from app.models.submission import Submission
from app.models.user import User


class CRUDUser(CRUDBase[User, Any, Any]):
    def __init__(self):
        super().__init__(User)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        stmt = select(User).where(func.lower(User.email) == email.lower())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, username: str) -> Optional[User]:
        stmt = select(User).where(func.lower(User.username) == username.lower())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_identifier(self, db: AsyncSession, identifier: str) -> Optional[User]:
        stmt = select(User).where(
            (func.lower(User.email) == identifier.lower())
            | (func.lower(User.username) == identifier.lower())
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_paginated(
        self, db: AsyncSession, *, page: int = 1, size: int = 20
    ) -> Tuple[List[User], int]:
        total_stmt = select(func.count(User.id))
        total_res = await db.execute(total_stmt)
        total = total_res.scalar() or 0

        offset = (page - 1) * size
        stmt = select(User).order_by(User.id.asc()).offset(offset).limit(size)
        res = await db.execute(stmt)
        items = list(res.scalars().all())
        return items, total

    async def get_user_stats(self, db: AsyncSession, user_id: int) -> Dict[str, Any]:
        user = await self.get(db, user_id)
        if not user:
            return {
                "eco_points": 0,
                "co2_saved_kg": 0.0,
                "rank": 1,
                "badge_count": 0,
                "completed_challenges_count": 0,
                "challenges_completed": 0,
            }

        # Calculate rank by eco_points
        rank_stmt = select(func.count(User.id)).where(User.eco_points > user.eco_points)
        rank_res = await db.execute(rank_stmt)
        rank = (rank_res.scalar() or 0) + 1

        # Calculate total co2 saved
        co2_stmt = select(func.coalesce(func.sum(CarbonRecord.co2_kg), 0.0)).where(
            CarbonRecord.user_id == user_id,
            CarbonRecord.direction == CarbonDirection.SAVING,
        )
        co2_res = await db.execute(co2_stmt)
        total_co2_saved = float(co2_res.scalar() or 0.0)

        # Count badges
        badges_stmt = select(func.count(UserBadge.badge_id)).where(UserBadge.user_id == user_id)
        badges_res = await db.execute(badges_stmt)
        badge_count = int(badges_res.scalar() or 0)

        # Count approved submissions dynamically from database:
        # SELECT count(*) FROM submissions WHERE user_id = current_user.id AND status = 'APPROVED'
        completed_stmt = select(func.count(Submission.id)).where(
            Submission.user_id == user_id,
            Submission.status == SubmissionStatus.APPROVED,
        )
        completed_res = await db.execute(completed_stmt)
        completed_count = int(completed_res.scalar() or 0)

        return {
            "eco_points": user.eco_points,
            "co2_saved_kg": total_co2_saved,
            "rank": rank,
            "badge_count": badge_count,
            "completed_challenges_count": completed_count,
            "challenges_completed": completed_count,
        }


crud_user = CRUDUser()
