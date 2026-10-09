from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.crud.badge import crud_badge
from app.crud.carbon_record import crud_carbon_record
from app.crud.submission import crud_submission
from app.crud.user import crud_user
from app.models.badge import Badge
from app.models.carbon_record import CarbonRecord
from app.models.enums import (
    BadgeCriteriaType,
    CarbonDirection,
    CarbonSource,
    SubmissionStatus,
)
from app.models.submission import Submission
from app.models.user import User


class RewardService:
    @staticmethod
    async def evaluate_and_award_badges(
        db: AsyncSession,
        user: User,
        submission_id: Optional[int] = None,
    ) -> List[Badge]:
        """
        Check all badges against user's current progress and award new ones.
        """
        stmt = select(Badge)
        badges_result = await db.execute(stmt)
        all_badges = list(badges_result.scalars().all())

        user_badges = await crud_badge.get_user_badges(db, user.id)
        earned_badge_ids = {ub.badge_id for ub in user_badges}

        # Calculate user stats
        approved_count = await crud_submission.count_user_approved(db, user.id)
        co2_saved = await crud_carbon_record.get_user_co2_saved(db, user.id)

        newly_awarded: List[Badge] = []
        for badge in all_badges:
            if badge.id in earned_badge_ids:
                continue

            should_award = False
            if badge.criteria_type == BadgeCriteriaType.POINTS_TOTAL:
                if user.eco_points >= badge.criteria_value:
                    should_award = True
            elif badge.criteria_type == BadgeCriteriaType.CO2_SAVED_TOTAL:
                if co2_saved >= badge.criteria_value:
                    should_award = True
            elif badge.criteria_type == BadgeCriteriaType.SUBMISSIONS_APPROVED:
                if approved_count >= badge.criteria_value:
                    should_award = True

            if should_award:
                await crud_badge.award_badge(
                    db,
                    user_id=user.id,
                    badge_id=badge.id,
                    awarded_for_submission_id=submission_id,
                )
                newly_awarded.append(badge)

        return newly_awarded

    @classmethod
    async def approve_submission(
        cls,
        db: AsyncSession,
        submission_id: int,
        reviewer_id: int,
        review_note: Optional[str] = None,
    ) -> Submission:
        """
        Atomic approval transaction.
        Idempotent: returns 409 if already approved.
        """
        sub = await crud_submission.get_with_details(db, submission_id)
        if not sub:
            raise NotFoundException(
                detail=f"Submission {submission_id} not found",
                code="SUBMISSION_NOT_FOUND",
            )

        if sub.status == SubmissionStatus.APPROVED:
            raise ConflictException(
                detail="Submission has already been approved",
                code="SUBMISSION_ALREADY_APPROVED",
            )

        now = datetime.now(timezone.utc)
        sub.status = SubmissionStatus.APPROVED
        sub.reviewed_by = reviewer_id
        sub.reviewed_at = now
        sub.review_note = review_note
        sub.points_awarded = sub.challenge.points_reward

        # Update user's eco_points
        user = await crud_user.get(db, sub.user_id)
        if user:
            user.eco_points += sub.points_awarded
            db.add(user)

        # Create CarbonRecord for verified challenge
        carbon_rec = CarbonRecord(
            user_id=sub.user_id,
            submission_id=sub.id,
            source=CarbonSource.VERIFIED_CHALLENGE,
            category=sub.challenge.category,
            activity_type=f"challenge_{sub.challenge_id}",
            quantity=1.0,
            unit="completion",
            co2_kg=sub.challenge.co2_saved_kg,
            direction=CarbonDirection.SAVING,
            recorded_on=now.date(),
        )
        db.add(carbon_rec)
        db.add(sub)

        await db.commit()
        await db.refresh(sub)

        # Check and award badges
        if user:
            await cls.evaluate_and_award_badges(db, user, submission_id=sub.id)

        return sub


reward_service = RewardService()
