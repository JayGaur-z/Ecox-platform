import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_badges_and_leaderboard(
    client: AsyncClient,
    normal_user_headers: dict,
    admin_user_headers: dict,
):
    # Test public /badges
    resp = await client.get("/api/v1/badges")
    assert resp.status_code == 200
    badges = resp.json()
    assert isinstance(badges, list)

    # Test /badges/me with user token
    resp = await client.get(
        "/api/v1/badges/me",
        headers=normal_user_headers,
    )
    assert resp.status_code == 200
    my_badges = resp.json()
    assert isinstance(my_badges, list)

    # Test /leaderboard
    resp = await client.get("/api/v1/leaderboard")
    assert resp.status_code == 200
    lb = resp.json()
    assert isinstance(lb, list)


@pytest.mark.asyncio
async def test_submission_lifecycle(
    client: AsyncClient,
    normal_user_headers: dict,
    admin_user_headers: dict,
):
    # 1. Create a challenge as admin first
    ch_payload = {
        "title": "Recycle Plastic",
        "description": "Recycle plastic bottles",
        "category": "waste",
        "points_reward": 50,
        "co2_saved_kg": 1.5,
        "difficulty": "easy",
        "verification_requirements": {"photo": True, "timestamp": True},
        "is_active": True,
    }
    create_ch = await client.post(
        "/api/v1/challenges",
        json=ch_payload,
        headers=admin_user_headers,
    )
    assert create_ch.status_code == 201
    ch_id = create_ch.json()["id"]

    # 2. Submit proof as user
    sub_payload = {
        "challenge_id": ch_id,
        "photo_url": "https://example.com/proof.jpg",
        "qr_payload": "ECOX-STATION-01",
    }
    sub_resp = await client.post(
        "/api/v1/submissions",
        json=sub_payload,
        headers=normal_user_headers,
    )
    assert sub_resp.status_code == 201
    sub_data = sub_resp.json()
    sub_id = sub_data["id"]
    assert sub_data["status"] in ("PENDING_REVIEW", "pending")

    # 3. User checks my submissions
    my_subs = await client.get(
        "/api/v1/submissions/me",
        headers=normal_user_headers,
    )
    assert my_subs.status_code == 200
    assert any(s["id"] == sub_id for s in my_subs.json())

    # 4. Admin checks review queue
    admin_queue = await client.get(
        "/api/v1/submissions",
        headers=admin_user_headers,
    )
    assert admin_queue.status_code == 200
    assert any(s["id"] == sub_id for s in admin_queue.json())

    # 5. Admin verifies and approves submission
    verify_resp = await client.post(
        "/api/v1/submissions/verify",
        json={"submission_id": sub_id, "decision": "approved", "note": "Great work!"},
        headers=admin_user_headers,
    )
    assert verify_resp.status_code == 200
    assert str(verify_resp.json()["status"]).upper() == "APPROVED"
    assert verify_resp.json()["points_awarded"] == 50

    # 6. Verify idempotency - approving again returns 409
    dup_resp = await client.post(
        "/api/v1/submissions/verify",
        json={"submission_id": sub_id, "decision": "approved", "note": "Re-approve"},
        headers=admin_user_headers,
    )
    assert dup_resp.status_code == 409
