from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_admin
from app.crud.badge import crud_badge
from app.models.badge import Badge
from app.models.user import User
from app.schemas.badge import BadgeCreate, BadgeRead, UserBadgeRead

router = APIRouter(prefix="/badges", tags=["Badges"])


@router.get("", response_model=List[BadgeRead])
async def list_badges(
    db: AsyncSession = Depends(get_db),
) -> List[BadgeRead]:
    """
    Get all available badges in the system.
    """
    stmt = select(Badge).order_by(Badge.criteria_value.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/me", response_model=List[UserBadgeRead])
async def get_my_badges(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[UserBadgeRead]:
    """
    Get all badges earned by the currently authenticated user.
    """
    user_badges = await crud_badge.get_user_badges(db, current_user.id)
    return [
        UserBadgeRead(
            badge=BadgeRead.model_validate(ub.badge),
            awarded_at=ub.awarded_at,
            awarded_for_submission_id=ub.awarded_for_submission_id,
        )
        for ub in user_badges
    ]


@router.post("", response_model=BadgeRead, status_code=status.HTTP_201_CREATED)
async def create_badge(
    badge_in: BadgeCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> BadgeRead:
    """
    Admin only: create a new system badge.
    """
    badge = await crud_badge.create(db, obj_in=badge_in)
    return BadgeRead.model_validate(badge)
