import asyncio
from datetime import date, datetime, timezone
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.challenge import Challenge
from app.models.badge import Badge, UserBadge
from app.models.carbon_record import CarbonRecord
from app.models.submission import Submission
from app.models.enums import (
    BadgeCriteriaType,
    CarbonDirection,
    CarbonSource,
    ChallengeCategory,
    ChallengeDifficulty,
    SubmissionStatus,
    UserRole,
    VerificationCheckStatus,
)


async def seed():
    async with AsyncSessionLocal() as session:
        # 1. Admin user
        admin_stmt = select(User).where(User.email == "admin@ecox.com")
        admin_res = await session.execute(admin_stmt)
        admin = admin_res.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@ecox.com",
                username="admin",
                hashed_password=get_password_hash("123456"),
                role=UserRole.ADMIN,
                eco_points=750,
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            await session.refresh(admin)
            print("Created admin user: admin@ecox.com")

        # 2. Demo user + 4 additional leaderboard users (5+ users total)
        users_data = [
            {"email": "demo@ecox.com", "username": "ayush", "eco_points": 420, "role": UserRole.USER},
            {"email": "priya@ecox.com", "username": "priya_sharma", "eco_points": 350, "role": UserRole.USER},
            {"email": "rohit@ecox.com", "username": "rohit_patel", "eco_points": 280, "role": UserRole.USER},
            {"email": "neha@ecox.com", "username": "neha_gupta", "eco_points": 210, "role": UserRole.USER},
            {"email": "vikram@ecox.com", "username": "vikram_rao", "eco_points": 160, "role": UserRole.USER},
        ]

        created_users = {}
        for u in users_data:
            stmt = select(User).where(User.email == u["email"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                user_obj = User(
                    email=u["email"],
                    username=u["username"],
                    hashed_password=get_password_hash("123456"),
                    role=u["role"],
                    eco_points=u["eco_points"],
                    is_active=True,
                )
                session.add(user_obj)
                await session.commit()
                await session.refresh(user_obj)
                created_users[u["email"]] = user_obj
                print(f"Created user: {u['username']} ({u['email']})")
            else:
                existing.eco_points = u["eco_points"]
                session.add(existing)
                await session.commit()
                await session.refresh(existing)
                created_users[u["email"]] = existing

        demo_user = created_users["demo@ecox.com"]

        # 3. Seed active challenges (6 challenges across categories)
        challenges_data = [
            {
                "title": "Green Commute",
                "description": "Use public transport instead of a private vehicle for your journey.",
                "category": ChallengeCategory.TRANSPORT,
                "points_reward": 100,
                "co2_saved_kg": 2.5,
                "difficulty": ChallengeDifficulty.EASY,
                "verification_requirements": {"photo": True, "gps": True, "timestamp": True},
                "is_active": True,
            },
            {
                "title": "Plant a Tree",
                "description": "Plant and document a tree sapling in your community.",
                "category": ChallengeCategory.OTHER,
                "points_reward": 150,
                "co2_saved_kg": 5.0,
                "difficulty": ChallengeDifficulty.MEDIUM,
                "verification_requirements": {"photo": True, "gps": True, "timestamp": True},
                "is_active": True,
            },
            {
                "title": "Waste Sorting",
                "description": "Properly separate recyclable and non-recyclable waste for one week.",
                "category": ChallengeCategory.WASTE,
                "points_reward": 80,
                "co2_saved_kg": 1.8,
                "difficulty": ChallengeDifficulty.EASY,
                "verification_requirements": {"photo": True, "timestamp": True},
                "is_active": True,
            },
            {
                "title": "Energy Saver",
                "description": "Turn off all standby appliances and reduce home electricity consumption.",
                "category": ChallengeCategory.ENERGY,
                "points_reward": 60,
                "co2_saved_kg": 1.2,
                "difficulty": ChallengeDifficulty.EASY,
                "verification_requirements": {"photo": True, "timestamp": True},
                "is_active": True,
            },
            {
                "title": "Meatless Monday",
                "description": "Choose plant-based meals for an entire day to reduce agricultural emissions.",
                "category": ChallengeCategory.FOOD,
                "points_reward": 70,
                "co2_saved_kg": 2.1,
                "difficulty": ChallengeDifficulty.EASY,
                "verification_requirements": {"photo": True, "timestamp": True},
                "is_active": True,
            },
            {
                "title": "Water Conservation",
                "description": "Fix leaking taps and practice 5-minute showers for a full week.",
                "category": ChallengeCategory.WATER,
                "points_reward": 90,
                "co2_saved_kg": 1.5,
                "difficulty": ChallengeDifficulty.EASY,
                "verification_requirements": {"photo": True, "timestamp": True},
                "is_active": True,
            },
        ]

        seeded_challenges = {}
        for c_data in challenges_data:
            stmt = select(Challenge).where(Challenge.title == c_data["title"])
            res = await session.execute(stmt)
            existing_c = res.scalar_one_or_none()
            if not existing_c:
                c = Challenge(
                    **c_data,
                    created_by=admin.id if admin else None,
                )
                session.add(c)
                await session.commit()
                await session.refresh(c)
                seeded_challenges[c_data["title"]] = c
                print(f"Seeded challenge: {c_data['title']}")
            else:
                seeded_challenges[c_data["title"]] = existing_c

        # 4. Seed 5+ badges with unlocked/locked criteria
        badges_data = [
            {
                "code": "b_starter",
                "name": "Green Starter",
                "description": "Completed your first eco action and earned 100+ points.",
                "icon_url": "🌱",
                "criteria_type": BadgeCriteriaType.POINTS_TOTAL,
                "criteria_value": 100.0,
            },
            {
                "code": "b_commuter",
                "name": "Commute Hero",
                "description": "Saved 10kg of CO2 using low-carbon transit.",
                "icon_url": "🚍",
                "criteria_type": BadgeCriteriaType.CO2_SAVED_TOTAL,
                "criteria_value": 10.0,
            },
            {
                "code": "b_recycler",
                "name": "Zero Waste Champion",
                "description": "Completed 3 verified recycling or waste sorting challenges.",
                "icon_url": "♻️",
                "criteria_type": BadgeCriteriaType.SUBMISSIONS_APPROVED,
                "criteria_value": 3.0,
            },
            {
                "code": "b_energy",
                "name": "Energy Wizard",
                "description": "Earned 500+ points through electricity reduction and efficiency.",
                "icon_url": "⚡",
                "criteria_type": BadgeCriteriaType.POINTS_TOTAL,
                "criteria_value": 500.0,
            },
            {
                "code": "b_champion",
                "name": "Earth Guardian",
                "description": "Reached 1,000 Eco Points contributing to campus sustainability.",
                "icon_url": "👑",
                "criteria_type": BadgeCriteriaType.POINTS_TOTAL,
                "criteria_value": 1000.0,
            },
        ]

        seeded_badges = {}
        for b_data in badges_data:
            stmt = select(Badge).where(Badge.code == b_data["code"])
            res = await session.execute(stmt)
            existing_b = res.scalar_one_or_none()
            if not existing_b:
                b = Badge(**b_data)
                session.add(b)
                await session.commit()
                await session.refresh(b)
                seeded_badges[b_data["code"]] = b
                print(f"Seeded badge: {b_data['name']}")
            else:
                seeded_badges[b_data["code"]] = existing_b

        # Unlock starter badge for demo user
        starter_badge = seeded_badges.get("b_starter")
        if starter_badge and demo_user:
            ub_stmt = select(UserBadge).where(
                UserBadge.user_id == demo_user.id,
                UserBadge.badge_id == starter_badge.id,
            )
            ub_res = await session.execute(ub_stmt)
            if not ub_res.scalar_one_or_none():
                user_badge = UserBadge(
                    user_id=demo_user.id,
                    badge_id=starter_badge.id,
                )
                session.add(user_badge)
                await session.commit()
                print("Awarded 'Green Starter' badge to demo user.")

        # 5. Pre-calculated carbon breakdown for the demo user
        carbon_stmt = select(CarbonRecord).where(CarbonRecord.user_id == demo_user.id)
        carbon_res = await session.execute(carbon_stmt)
        if not carbon_res.scalars().first():
            demo_carbon_entries = [
                {"category": ChallengeCategory.TRANSPORT, "activity_type": "car_commute", "quantity": 304.0, "unit": "km", "co2_kg": 52.0, "direction": CarbonDirection.EMISSION},
                {"category": ChallengeCategory.ENERGY, "activity_type": "electricity_grid", "quantity": 83.3, "unit": "kwh", "co2_kg": 35.0, "direction": CarbonDirection.EMISSION},
                {"category": ChallengeCategory.FOOD, "activity_type": "diet_mixed", "quantity": 30.0, "unit": "days", "co2_kg": 28.0, "direction": CarbonDirection.EMISSION},
                {"category": ChallengeCategory.WASTE, "activity_type": "waste_landfill", "quantity": 23.1, "unit": "kg", "co2_kg": 13.4, "direction": CarbonDirection.EMISSION},
                # And a verified saving
                {"category": ChallengeCategory.TRANSPORT, "activity_type": "challenge_commute", "quantity": 1.0, "unit": "trip", "co2_kg": 18.5, "direction": CarbonDirection.SAVING, "source": CarbonSource.VERIFIED_CHALLENGE},
            ]
            for ent in demo_carbon_entries:
                cr = CarbonRecord(
                    user_id=demo_user.id,
                    source=ent.get("source", CarbonSource.SELF_REPORTED),
                    category=ent["category"],
                    activity_type=ent["activity_type"],
                    quantity=ent["quantity"],
                    unit=ent["unit"],
                    co2_kg=ent["co2_kg"],
                    direction=ent["direction"],
                    recorded_on=date.today(),
                )
                session.add(cr)
            await session.commit()
            print("Seeded pre-calculated carbon breakdown for demo user.")

        # 6. At least 1 pending submission for the Admin verification queue
        sub_stmt = select(Submission).where(
            Submission.status == SubmissionStatus.PENDING_REVIEW
        )
        sub_res = await session.execute(sub_stmt)
        if not sub_res.scalars().first():
            green_commute = seeded_challenges.get("Green Commute")
            if green_commute and demo_user:
                pending_sub = Submission(
                    user_id=demo_user.id,
                    challenge_id=green_commute.id,
                    status=SubmissionStatus.PENDING_REVIEW,
                    photo_url="https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=60",
                    is_flagged=True,
                    flag_reason="Photo taken >2 hours ago or metadata stripped (possible old photo or screenshot)",
                    latitude=19.2062,
                    longitude=72.8738,
                    gps_accuracy_m=12.5,
                    captured_at=datetime.now(timezone.utc),
                    qr_payload="ECOX-STATION-01",
                    gps_check=VerificationCheckStatus.PASSED,
                    timestamp_check=VerificationCheckStatus.PASSED,
                    qr_check=VerificationCheckStatus.PASSED,
                    ai_confidence=0.96,
                    ai_notes="Clean transit evidence: Bus ticket and metro card identified.",
                    points_awarded=0,
                )
                session.add(pending_sub)
                await session.commit()
                print("Created pending submission with fraud check metadata for Admin queue.")

        print("Comprehensive database seed finished successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
