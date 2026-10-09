from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.badge import Badge, UserBadge
from app.schemas.badge import BadgeCreate, BadgeUpdate


class CRUDBadge(CRUDBase[Badge, BadgeCreate, BadgeUpdate]):
    async def get_by_code(self, db: AsyncSession, code: str) -> Optional[Badge]:
        stmt = select(Badge).where(Badge.code == code)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_badges(self, db: AsyncSession, user_id: int) -> List[UserBadge]:
        stmt = (
            select(UserBadge)
            .where(UserBadge.user_id == user_id)
            .options(selectinload(UserBadge.badge))
            .order_by(UserBadge.awarded_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def has_badge(self, db: AsyncSession, user_id: int, badge_id: int) -> bool:
        stmt = select(UserBadge).where(
            UserBadge.user_id == user_id,
            UserBadge.badge_id == badge_id,
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def award_badge(
        self,
        db: AsyncSession,
        user_id: int,
        badge_id: int,
        awarded_for_submission_id: Optional[int] = None,
    ) -> UserBadge:
        user_badge = UserBadge(
            user_id=user_id,
            badge_id=badge_id,
            awarded_for_submission_id=awarded_for_submission_id,
        )
        db.add(user_badge)
        await db.commit()
        await db.refresh(user_badge)
        return user_badge


crud_badge = CRUDBadge(Badge)
