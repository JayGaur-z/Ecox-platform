from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.challenge import Challenge
from app.models.enums import ChallengeCategory, ChallengeDifficulty


class CRUDChallenge(CRUDBase[Challenge, Any, Any]):
    def __init__(self):
        super().__init__(Challenge)

    async def get_paginated(
        self,
        db: AsyncSession,
        *,
        category: Optional[ChallengeCategory] = None,
        difficulty: Optional[ChallengeDifficulty] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Challenge], int]:
        filters = []
        if category is not None:
            filters.append(Challenge.category == category)
        if difficulty is not None:
            filters.append(Challenge.difficulty == difficulty)
        if is_active is not None:
            filters.append(Challenge.is_active == is_active)

        total_stmt = select(func.count(Challenge.id))
        if filters:
            total_stmt = total_stmt.where(*filters)
        total_res = await db.execute(total_stmt)
        total = total_res.scalar() or 0

        offset = (page - 1) * size
        stmt = select(Challenge)
        if filters:
            stmt = stmt.where(*filters)
        stmt = stmt.order_by(Challenge.created_at.desc()).offset(offset).limit(size)

        res = await db.execute(stmt)
        items = list(res.scalars().all())
        return items, total

    async def soft_delete(self, db: AsyncSession, challenge: Challenge) -> Challenge:
        challenge.is_active = False
        db.add(challenge)
        await db.commit()
        await db.refresh(challenge)
        return challenge


crud_challenge = CRUDChallenge()
