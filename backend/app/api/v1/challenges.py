from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_admin
from app.models.enums import ChallengeCategory, ChallengeDifficulty
from app.models.user import User
from app.schemas.challenge import ChallengeCreate, ChallengeRead, ChallengeUpdate
from app.schemas.common import Page
from app.services.challenge_service import challenge_service

router = APIRouter(prefix="/challenges", tags=["Challenges"])


@router.get(
    "",
    response_model=Page[ChallengeRead],
    status_code=status.HTTP_200_OK,
    summary="List challenges with filters and pagination",
)
async def list_challenges(
    category: Optional[ChallengeCategory] = Query(None, description="Filter by category"),
    difficulty: Optional[ChallengeDifficulty] = Query(None, description="Filter by difficulty"),
    is_active: Optional[bool] = Query(True, description="Filter active status (default: true)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size (max 100)"),
    db: AsyncSession = Depends(get_db),
) -> Page[ChallengeRead]:
    items, total = await challenge_service.list_challenges(
        db,
        category=category,
        difficulty=difficulty,
        is_active=is_active,
        page=page,
        size=size,
    )
    models = [ChallengeRead.model_validate(item) for item in items]
    return Page.create(items=models, total=total, page=page, size=size)


@router.get(
    "/{challenge_id}",
    response_model=ChallengeRead,
    status_code=status.HTTP_200_OK,
    summary="Get details of a specific challenge",
)
async def get_challenge(
    challenge_id: int,
    db: AsyncSession = Depends(get_db),
) -> ChallengeRead:
    challenge = await challenge_service.get_challenge_by_id(db, challenge_id=challenge_id)
    return ChallengeRead.model_validate(challenge)


@router.post(
    "",
    response_model=ChallengeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new challenge (Admin only)",
)
async def create_challenge(
    challenge_in: ChallengeCreate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ChallengeRead:
    challenge = await challenge_service.create_challenge(
        db,
        challenge_in=challenge_in,
        creator_id=current_admin.id,
    )
    return ChallengeRead.model_validate(challenge)


@router.patch(
    "/{challenge_id}",
    response_model=ChallengeRead,
    status_code=status.HTTP_200_OK,
    summary="Update an existing challenge (Admin only)",
)
async def update_challenge(
    challenge_id: int,
    challenge_in: ChallengeUpdate,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ChallengeRead:
    challenge = await challenge_service.update_challenge(
        db,
        challenge_id=challenge_id,
        challenge_in=challenge_in,
    )
    return ChallengeRead.model_validate(challenge)


@router.delete(
    "/{challenge_id}",
    response_model=ChallengeRead,
    status_code=status.HTTP_200_OK,
    summary="Soft delete a challenge by setting is_active=False (Admin only)",
)
async def delete_challenge(
    challenge_id: int,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> ChallengeRead:
    challenge = await challenge_service.soft_delete_challenge(
        db,
        challenge_id=challenge_id,
    )
    return ChallengeRead.model_validate(challenge)
