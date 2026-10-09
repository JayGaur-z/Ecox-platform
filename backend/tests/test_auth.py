import pytest
from httpx import AsyncClient

from app.models.user import User


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "strongpassword123",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["username"] == "newuser"
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, normal_user: User):
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": normal_user.email,
            "username": "distinct_username",
            "password": "password123",
        },
    )
    assert response.status_code == 409
    data = response.json()
    assert data["code"] == "EMAIL_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, normal_user: User):
    # Login with username
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username_or_email": normal_user.username,
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    # Login with email
    response_email = await client.post(
        "/api/v1/auth/login",
        json={
            "username_or_email": normal_user.email,
            "password": "password123",
        },
    )
    assert response_email.status_code == 200


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, normal_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username_or_email": normal_user.username,
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401
    data = response.json()
    assert data["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient, normal_user: User):
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "username_or_email": normal_user.username,
            "password": "password123",
        },
    )
    refresh_token = login_resp.json()["refresh_token"]

    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 200
    data = refresh_resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient, normal_user: User, normal_user_headers: dict):
    # Valid auth
    response = await client.get("/api/v1/auth/me", headers=normal_user_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == normal_user.username

    # Missing auth
    unauth = await client.get("/api/v1/auth/me")
    assert unauth.status_code == 401
    assert unauth.json()["code"] == "MISSING_CREDENTIALS"


@pytest.mark.asyncio
async def test_user_stats(client: AsyncClient, normal_user_headers: dict):
    response = await client.get("/api/v1/users/me/stats", headers=normal_user_headers)
    assert response.status_code == 200
    data = response.json()
    assert "eco_points" in data
    assert "rank" in data
    assert "co2_saved_kg" in data


@pytest.mark.asyncio
async def test_admin_guard(
    client: AsyncClient,
    normal_user_headers: dict,
    admin_user_headers: dict,
):
    # Regular user attempting admin endpoint
    resp_forbidden = await client.get("/api/v1/users", headers=normal_user_headers)
    assert resp_forbidden.status_code == 403
    assert resp_forbidden.json()["code"] == "ADMIN_REQUIRED"

    # Admin accessing admin endpoint
    resp_ok = await client.get("/api/v1/users", headers=admin_user_headers)
    assert resp_ok.status_code == 200
    data = resp_ok.json()
    assert "items" in data
    assert len(data["items"]) >= 1
