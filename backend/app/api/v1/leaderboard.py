from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.enums import CarbonDirection, SubmissionStatus
from app.models.carbon_record import CarbonRecord
from app.models.submission import Submission
from app.models.user import User
from app.schemas.competition import LeaderboardEntry

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("", response_model=List[LeaderboardEntry])
async def get_global_leaderboard(
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> List[LeaderboardEntry]:
    """
    Get global leaderboard ranked by eco_points.
    """
    stmt = (
        select(User)
        .where(User.is_active == True)
        .order_by(User.eco_points.desc(), User.id.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    users = list(result.scalars().all())

    leaderboard: List[LeaderboardEntry] = []
    for rank_idx, user in enumerate(users, start=1):
        # Calculate co2 saved
        co2_stmt = select(func.coalesce(func.sum(CarbonRecord.co2_kg), 0.0)).where(
            CarbonRecord.user_id == user.id,
            CarbonRecord.direction == CarbonDirection.SAVING,
        )
        co2_res = await db.execute(co2_stmt)
        co2_saved = float(co2_res.scalar_one())

        # Count approved submissions
        sub_stmt = select(func.count(Submission.id)).where(
            Submission.user_id == user.id,
            Submission.status == SubmissionStatus.APPROVED,
        )
        sub_res = await db.execute(sub_stmt)
        challenges_count = int(sub_res.scalar_one())

        leaderboard.append(
            LeaderboardEntry(
                rank=rank_idx,
                id=user.id,
                name=user.username.replace("_", " ").title(),
                username=user.username,
                college="TCET Mumbai",
                eco_points=user.eco_points,
                co2_saved_kg=round(co2_saved, 1),
                challenges_completed=challenges_count,
            )
        )

    return leaderboard
