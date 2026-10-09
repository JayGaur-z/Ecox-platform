import io
import pytest
from httpx import AsyncClient
from PIL import Image


@pytest.mark.asyncio
async def test_admin_login_isolation(client: AsyncClient, normal_user, admin_user):
    # 1. Student credentials to /auth/admin/login must return 403 Forbidden
    student_payload = {
        "username_or_email": normal_user.email,
        "password": "password123",
    }
    resp = await client.post("/api/v1/auth/admin/login", json=student_payload)
    assert resp.status_code == 403
    assert "Administrative privileges required" in resp.json()["detail"]

    # 2. Admin credentials to /auth/admin/login must succeed with 200 OK
    admin_payload = {
        "username_or_email": admin_user.email,
        "password": "adminpassword123",
    }
    admin_resp = await client.post("/api/v1/auth/admin/login", json=admin_payload)
    assert admin_resp.status_code == 200
    assert "access_token" in admin_resp.json()


@pytest.mark.asyncio
async def test_multipart_submission_exif_flagging(
    client: AsyncClient,
    normal_user_headers: dict,
    admin_user_headers: dict,
):
    # Create challenge
    ch = await client.post(
        "/api/v1/challenges",
        json={
            "title": "Bike To Class",
            "description": "Zero emissions commute",
            "category": "transport",
            "points_reward": 80,
            "co2_saved_kg": 2.5,
            "difficulty": "easy",
            "verification_requirements": {"photo": True},
            "is_active": True,
        },
        headers=admin_user_headers,
    )
    assert ch.status_code == 201
    ch_id = ch.json()["id"]

    # Generate an in-memory image without EXIF (e.g. screenshot or stripped photo)
    img = Image.new("RGB", (120, 120), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    # Post multipart form data with file
    files = {"file": ("screenshot.jpg", buf, "image/jpeg")}
    data = {"challenge_id": str(ch_id)}
    sub_resp = await client.post(
        "/api/v1/submissions",
        data=data,
        files=files,
        headers=normal_user_headers,
    )
    assert sub_resp.status_code == 201
    sub = sub_resp.json()
    assert sub["status"] == "PENDING_REVIEW"
    assert sub["is_flagged"] is True
    assert "Photo taken >2 hours ago or metadata stripped" in sub["flag_reason"]
    assert sub["photo_url"].startswith("/uploads/")


@pytest.mark.asyncio
async def test_dynamic_reduction_planner_vegetarian_rules(
    client: AsyncClient,
    normal_user_headers: dict,
):
    # Request reduction plan with vegetarian diet
    resp = await client.get(
        "/api/v1/carbon/reduction-plan?diet=vegetarian",
        headers=normal_user_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["diet_type"] == "vegetarian"

    titles = [s["title"].lower() for s in data["suggestions"]]
    actions = [s["action"].lower() for s in data["suggestions"]]

    # NEVER output 'eat less meat' or 'meatless mondays'
    for title in titles:
        assert "meat" not in title

    for action in actions:
        assert "meatless monday" not in action
        assert "eat less meat" not in action

    # Must contain targeted vegetarian actions
    assert any("local seasonal" in t for t in titles)
    assert any("compost" in t for t in titles)
    assert any("induction cooking" in t for t in titles)
    assert any("bulk storage" in t for t in titles)
