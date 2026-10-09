import asyncio
import httpx
from app.main import app

async def verify_endpoints():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        r = await client.get("/api/v1/health")
        assert r.status_code == 200, f"Health check failed: {r.text}"
        print("[OK] GET /api/v1/health passed")

        # 2. Login demo user
        r = await client.post("/api/v1/auth/login", json={"username_or_email": "demo@ecox.com", "password": "123456"})
        assert r.status_code == 200, f"Demo login failed: {r.text}"
        tokens = r.json()
        token = tokens["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[OK] POST /api/v1/auth/login passed")

        # 3. GET /auth/me
        r = await client.get("/api/v1/auth/me", headers=headers)
        assert r.status_code == 200, f"Auth me failed: {r.text}"
        user = r.json()
        assert user["email"] == "demo@ecox.com"
        print("[OK] GET /api/v1/auth/me passed")

        # 4. GET /challenges
        r = await client.get("/api/v1/challenges")
        assert r.status_code == 200, f"Challenges failed: {r.text}"
        ch_page = r.json()
        assert ch_page["total"] >= 5, f"Expected 5+ challenges, got {ch_page['total']}"
        print(f"[OK] GET /api/v1/challenges passed ({ch_page['total']} challenges)")

        # 5. GET /carbon/summary
        r = await client.get("/api/v1/carbon/summary?period=month", headers=headers)
        assert r.status_code == 200, f"Carbon summary failed: {r.text}"
        summary = r.json()
        assert summary["total_emissions_kg"] > 0
        print(f"[OK] GET /api/v1/carbon/summary passed (Emissions: {summary['total_emissions_kg']} kg)")

        # 6. GET /badges
        r = await client.get("/api/v1/badges")
        assert r.status_code == 200, f"Badges failed: {r.text}"
        badges = r.json()
        assert len(badges) >= 5, f"Expected 5+ badges, got {len(badges)}"
        print(f"[OK] GET /api/v1/badges passed ({len(badges)} badges)")

        # 7. GET /badges/me
        r = await client.get("/api/v1/badges/me", headers=headers)
        assert r.status_code == 200, f"My badges failed: {r.text}"
        my_badges = r.json()
        print(f"[OK] GET /api/v1/badges/me passed ({len(my_badges)} earned)")

        # 8. GET /leaderboard
        r = await client.get("/api/v1/leaderboard")
        assert r.status_code == 200, f"Leaderboard failed: {r.text}"
        lb = r.json()
        assert len(lb) >= 5, f"Expected 5+ leaderboard users, got {len(lb)}"
        print(f"[OK] GET /api/v1/leaderboard passed ({len(lb)} ranking entries)")

        # 9. Login admin user
        r_admin = await client.post("/api/v1/auth/login", json={"username_or_email": "admin@ecox.com", "password": "123456"})
        assert r_admin.status_code == 200, f"Admin login failed: {r_admin.text}"
        admin_token = r_admin.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("[OK] POST /api/v1/auth/login (Admin) passed")

        # 10. GET /submissions (Admin queue)
        r = await client.get("/api/v1/submissions", headers=admin_headers)
        assert r.status_code == 200, f"Admin submissions queue failed: {r.text}"
        admin_subs = r.json()
        assert len(admin_subs) >= 1, f"Expected >= 1 pending submission, got {len(admin_subs)}"
        print(f"[OK] GET /api/v1/submissions (Admin queue) passed ({len(admin_subs)} submissions)")

        print("\nALL 10 API CONTRACT & DATABASE VERIFICATIONS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    asyncio.run(verify_endpoints())
