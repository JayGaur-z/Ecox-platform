from datetime import date
import pytest
from httpx import AsyncClient

from app.models.enums import CarbonDirection, CarbonSource, ChallengeCategory
from app.models.user import User


@pytest.mark.asyncio
async def test_carbon_record_lifecycle_and_calculations(
    client: AsyncClient,
    normal_user: User,
    normal_user_headers: dict,
    admin_user_headers: dict,
):
    # 1. Create a self-reported record (car commute, 20 km)
    # emission factor for (car_commute, km) is ~0.171 kg/km -> 20 * 0.171 = 3.42 kg CO2
    payload = {
        "category": "transport",
        "activity_type": "car_commute",
        "quantity": 20.0,
        "unit": "km",
        "recorded_on": str(date.today()),
    }
    resp_create = await client.post(
        "/api/v1/carbon/records",
        json=payload,
        headers=normal_user_headers,
    )
    assert resp_create.status_code == 201
    data = resp_create.json()
    record_id = data["id"]
    assert data["co2_kg"] == 3.42
    assert data["source"] == "self_reported"
    assert data["direction"] == "emission"

    # Create another record for electricity
    # emission factor for (electricity_grid, kwh) is 0.420 kg/kWh -> 100 * 0.42 = 42.0 kg CO2
    payload2 = {
        "category": "energy",
        "activity_type": "electricity_grid",
        "quantity": 100.0,
        "unit": "kwh",
    }
    resp_create2 = await client.post(
        "/api/v1/carbon/records",
        json=payload2,
        headers=normal_user_headers,
    )
    assert resp_create2.status_code == 201
    assert resp_create2.json()["co2_kg"] == 42.0

    # 2. List records
    resp_list = await client.get("/api/v1/carbon/records", headers=normal_user_headers)
    assert resp_list.status_code == 200
    list_data = resp_list.json()
    assert list_data["total"] >= 2
    assert any(r["id"] == record_id for r in list_data["items"])

    # 3. Get carbon summary
    resp_summary = await client.get("/api/v1/carbon/summary?period=month", headers=normal_user_headers)
    assert resp_summary.status_code == 200
    summary = resp_summary.json()
    assert summary["period"] == "month"
    assert summary["total_emissions_kg"] >= 45.42

    # 4. Get carbon timeseries
    resp_timeseries = await client.get("/api/v1/carbon/timeseries?period=month", headers=normal_user_headers)
    assert resp_timeseries.status_code == 200
    timeseries = resp_timeseries.json()
    assert len(timeseries) >= 1
    assert timeseries[0]["emissions_kg"] > 0

    # 5. Ownership guard on deletion: another user gets 404 (rule 6)
    resp_other_delete = await client.delete(
        f"/api/v1/carbon/records/{record_id}",
        headers=admin_user_headers,
    )
    assert resp_other_delete.status_code == 404
    assert resp_other_delete.json()["code"] == "RECORD_NOT_FOUND"

    # 6. Owner deletes record (204)
    resp_delete = await client.delete(
        f"/api/v1/carbon/records/{record_id}",
        headers=normal_user_headers,
    )
    assert resp_delete.status_code == 204
