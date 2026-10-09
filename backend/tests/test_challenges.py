import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_challenge_crud_and_guards(
    client: AsyncClient,
    normal_user_headers: dict,
    admin_user_headers: dict,
):
    # 1. Non-admin cannot create challenge
    payload = {
        "title": "Carpool to Campus",
        "description": "Share rides with at least one classmate.",
        "category": "transport",
        "points_reward": 40,
        "co2_saved_kg": 2.5,
        "verification_requirements": {"photo": True, "gps": True, "timestamp": True},
        "difficulty": "easy",
        "is_active": True,
    }
    resp_unauth = await client.post("/api/v1/challenges", json=payload, headers=normal_user_headers)
    assert resp_unauth.status_code == 403

    # 2. Admin creates challenge
    resp_create = await client.post("/api/v1/challenges", json=payload, headers=admin_user_headers)
    assert resp_create.status_code == 201
    created_data = resp_create.json()
    challenge_id = created_data["id"]
    assert created_data["title"] == "Carpool to Campus"
    assert created_data["is_active"] is True

    # 3. Public lists challenges
    resp_list = await client.get("/api/v1/challenges?category=transport")
    assert resp_list.status_code == 200
    list_data = resp_list.json()
    assert list_data["total"] >= 1
    assert any(c["id"] == challenge_id for c in list_data["items"])

    # 4. Detail view
    resp_detail = await client.get(f"/api/v1/challenges/{challenge_id}")
    assert resp_detail.status_code == 200
    assert resp_detail.json()["id"] == challenge_id

    # 5. Admin updates challenge
    resp_update = await client.patch(
        f"/api/v1/challenges/{challenge_id}",
        json={"points_reward": 60},
        headers=admin_user_headers,
    )
    assert resp_update.status_code == 200
    assert resp_update.json()["points_reward"] == 60

    # 6. Soft delete challenge
    resp_delete = await client.delete(
        f"/api/v1/challenges/{challenge_id}",
        headers=admin_user_headers,
    )
    assert resp_delete.status_code == 200
    assert resp_delete.json()["is_active"] is False

    # Challenge is filtered out when is_active=True
    resp_active_list = await client.get("/api/v1/challenges?is_active=true")
    assert not any(c["id"] == challenge_id for c in resp_active_list.json()["items"])
