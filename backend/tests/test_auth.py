import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import engine, Base


@pytest.fixture(autouse=True, scope="module")
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:

        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register patient
        reg_payload = {
            "name": "Jean Dupont",
            "email": "jean.dupont@example.com",
            "phone": "+250788123456",
            "password": "SecurePassword123!",
            "age": 32,
            "district": "Gasabo",
            "sector": "Remera"
        }
        res = await ac.post("/api/v1/auth/register/patient", json=reg_payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["email"] == "jean.dupont@example.com"
        assert data["role"] == "patient"

        # Login
        login_payload = {
            "identifier": "jean.dupont@example.com",
            "password": "SecurePassword123!"
        }
        login_res = await ac.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200, login_res.text
        login_data = login_res.json()
        assert "access_token" in login_data
        token = login_data["access_token"]

        # /me
        me_res = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_res.status_code == 200, me_res.text
        assert me_res.json()["name"] == "Jean Dupont"
