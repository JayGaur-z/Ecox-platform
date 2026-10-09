from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_admin
from app.core.exceptions import NotFoundException
from app.crud.user import crud_user
from app.models.user import User
from app.schemas.common import Page
from app.schemas.user import UserAdminUpdate, UserRead, UserStats, UserUpdate
from app.services.auth_service import auth_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me/stats",
    response_model=UserStats,
    status_code=status.HTTP_200_OK,
    summary="Get statistics (points, CO2 saved, rank, badges) for current user",
)
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserStats:
    stats = await auth_service.get_stats(db, user_id=current_user.id)
    return UserStats(**stats)


@router.patch(
    "/me",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Update current user's profile",
)
async def update_my_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    updated = await auth_service.update_profile(db, user=current_user, update_in=user_in)
    return UserRead.model_validate(updated)


@router.get(
    "",
    response_model=Page[UserRead],
    status_code=status.HTTP_200_OK,
    summary="List all users paginated (Admin only)",
)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Page[UserRead]:
    items, total = await crud_user.get_paginated(db, page=page, size=size)
    models = [UserRead.model_validate(u) for u in items]
    return Page.create(items=models, total=total, page=page, size=size)


@router.patch(
    "/{user_id}",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Change user role or activation status (Admin only)",
)
async def admin_update_user(
    user_id: int,
    admin_in: UserAdminUpdate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    target_user = await crud_user.get(db, user_id)
    if not target_user:
        raise NotFoundException(detail="User not found", code="USER_NOT_FOUND")

    data = admin_in.model_dump(exclude_unset=True)
    updated = await crud_user.update(db, db_obj=target_user, obj_in=data)
    return UserRead.model_validate(updated)
