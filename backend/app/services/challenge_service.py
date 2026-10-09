from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.crud.challenge import crud_challenge
from app.models.challenge import Challenge
from app.models.enums import ChallengeCategory, ChallengeDifficulty
from app.schemas.challenge import ChallengeCreate, ChallengeUpdate


class ChallengeService:
    async def list_challenges(
        self,
        db: AsyncSession,
        *,
        category: Optional[ChallengeCategory] = None,
        difficulty: Optional[ChallengeDifficulty] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        size: int = 20,
    ) -> Tuple[List[Challenge], int]:
        return await crud_challenge.get_paginated(
            db,
            category=category,
            difficulty=difficulty,
            is_active=is_active,
            page=page,
            size=size,
        )

    async def get_challenge_by_id(
        self,
        db: AsyncSession,
        challenge_id: int,
    ) -> Challenge:
        challenge = await crud_challenge.get(db, challenge_id)
        if not challenge:
            raise NotFoundException(detail="Challenge not found", code="CHALLENGE_NOT_FOUND")
        return challenge

    async def create_challenge(
        self,
        db: AsyncSession,
        *,
        challenge_in: ChallengeCreate,
        creator_id: int,
    ) -> Challenge:
        data = challenge_in.model_dump()
        data["created_by"] = creator_id
        # Convert verification requirements to JSON dict if pydantic model
        if hasattr(challenge_in.verification_requirements, "model_dump"):
            data["verification_requirements"] = challenge_in.verification_requirements.model_dump()
        return await crud_challenge.create(db, obj_in=data)

    async def update_challenge(
        self,
        db: AsyncSession,
        *,
        challenge_id: int,
        challenge_in: ChallengeUpdate,
    ) -> Challenge:
        challenge = await self.get_challenge_by_id(db, challenge_id)
        update_data = challenge_in.model_dump(exclude_unset=True)
        if "verification_requirements" in update_data and update_data["verification_requirements"] is not None:
            if hasattr(challenge_in.verification_requirements, "model_dump"):
                update_data["verification_requirements"] = (
                    challenge_in.verification_requirements.model_dump()
                )
        return await crud_challenge.update(db, db_obj=challenge, obj_in=update_data)

    async def soft_delete_challenge(
        self,
        db: AsyncSession,
        challenge_id: int,
    ) -> Challenge:
        challenge = await self.get_challenge_by_id(db, challenge_id)
        return await crud_challenge.soft_delete(db, challenge=challenge)


challenge_service = ChallengeService()
