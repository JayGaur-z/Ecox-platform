from datetime import date, datetime, timedelta, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.badge import Badge, UserBadge
from app.models.carbon_record import CarbonRecord
from app.models.challenge import Challenge
from app.models.competition import (
    Competition,
    CompetitionChallenge,
    CompetitionParticipant,
)
from app.models.enums import (
    BadgeCriteriaType,
    CarbonDirection,
    CarbonSource,
    ChallengeCategory,
    ChallengeDifficulty,
    CompetitionMetric,
    CompetitionStatus,
    SubmissionStatus,
    UserRole,
    VerificationCheckStatus,
)
from app.models.submission import Submission
from app.models.user import User


@pytest.mark.asyncio
async def test_user_creation_and_defaults(db_session: AsyncSession):
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashedpassword123",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert user.id is not None
    assert user.role == UserRole.USER
    assert user.eco_points == 0
    assert user.is_active is True
    assert user.created_at is not None
    assert user.created_at.tzinfo is not None
    assert user.updated_at is not None


@pytest.mark.asyncio
async def test_user_unique_constraints(db_session: AsyncSession):
    user1 = User(
        email="unique@example.com",
        username="user1",
        hashed_password="password",
    )
    db_session.add(user1)
    await db_session.commit()

    user2 = User(
        email="unique@example.com",
        username="user2",
        hashed_password="password",
    )
    db_session.add(user2)
    with pytest.raises(IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_challenge_and_submission_workflow(db_session: AsyncSession):
    user = User(
        email="challenger@example.com",
        username="challenger",
        hashed_password="password",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    challenge = Challenge(
        title="Walk 5km",
        description="Replace short vehicle trips with walking.",
        category=ChallengeCategory.TRANSPORT,
        points_reward=50,
        co2_saved_kg=1.2,
        verification_requirements={"photo": True, "gps": True, "timestamp": True},
        difficulty=ChallengeDifficulty.EASY,
        created_by=user.id,
    )
    db_session.add(challenge)
    await db_session.commit()
    await db_session.refresh(challenge)

    assert challenge.id is not None
    assert challenge.verification_requirements["gps"] is True

    # Create submission
    now_utc = datetime.now(timezone.utc)
    submission = Submission(
        user_id=user.id,
        challenge_id=challenge.id,
        photo_url="https://storage.ecox.local/evidence/123.jpg",
        latitude=37.7749,
        longitude=-122.4194,
        gps_accuracy_m=5.0,
        captured_at=now_utc,
        gps_check=VerificationCheckStatus.PASSED,
        timestamp_check=VerificationCheckStatus.PASSED,
        qr_check=VerificationCheckStatus.SKIPPED,
        status=SubmissionStatus.PENDING,
    )
    db_session.add(submission)
    await db_session.commit()
    await db_session.refresh(submission)

    assert submission.id is not None
    assert submission.points_awarded == 0
    assert submission.gps_check == VerificationCheckStatus.PASSED


@pytest.mark.asyncio
async def test_carbon_record_creation(db_session: AsyncSession):
    user = User(
        email="carbon@example.com",
        username="carbonuser",
        hashed_password="password",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    record = CarbonRecord(
        user_id=user.id,
        source=CarbonSource.SELF_REPORTED,
        category=ChallengeCategory.TRANSPORT,
        activity_type="car_commute",
        quantity=15.0,
        unit="km",
        co2_kg=2.7,
        direction=CarbonDirection.EMISSION,
        recorded_on=date.today(),
    )
    db_session.add(record)
    await db_session.commit()
    await db_session.refresh(record)

    assert record.id is not None
    assert record.co2_kg == 2.7
    assert record.submission_id is None


@pytest.mark.asyncio
async def test_badges_and_user_badge_association(db_session: AsyncSession):
    user = User(
        email="badgeuser@example.com",
        username="badgeuser",
        hashed_password="password",
    )
    badge = Badge(
        code="eco_starter",
        name="Eco Starter",
        description="Completed your first challenge",
        criteria_type=BadgeCriteriaType.SUBMISSIONS_APPROVED,
        criteria_value=1.0,
    )
    db_session.add_all([user, badge])
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(badge)

    user_badge = UserBadge(
        user_id=user.id,
        badge_id=badge.id,
    )
    db_session.add(user_badge)
    await db_session.commit()

    stmt = select(UserBadge).where(UserBadge.user_id == user.id)
    result = await db_session.execute(stmt)
    ub = result.scalar_one()

    assert ub.badge_id == badge.id
    assert ub.awarded_at is not None


@pytest.mark.asyncio
async def test_competition_models(db_session: AsyncSession):
    user = User(
        email="compuser@example.com",
        username="compuser",
        hashed_password="password",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    now = datetime.now(timezone.utc)
    competition = Competition(
        name="Spring Campus Green Challenge",
        description="Reduce emissions this spring",
        starts_at=now - timedelta(days=1),
        ends_at=now + timedelta(days=6),
        scoring_metric=CompetitionMetric.POINTS,
        status=CompetitionStatus.ACTIVE,
        created_by=user.id,
    )
    db_session.add(competition)
    await db_session.commit()
    await db_session.refresh(competition)

    participant = CompetitionParticipant(
        competition_id=competition.id,
        user_id=user.id,
        score=100.0,
    )
    db_session.add(participant)
    await db_session.commit()

    stmt = select(CompetitionParticipant).where(
        CompetitionParticipant.competition_id == competition.id,
        CompetitionParticipant.user_id == user.id,
    )
    res = await db_session.execute(stmt)
    part = res.scalar_one()

    assert part.score == 100.0
    assert competition.computed_status == CompetitionStatus.ACTIVE
