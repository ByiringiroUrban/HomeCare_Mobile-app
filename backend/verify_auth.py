import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import engine, Base


async def main():
    print("1. Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully.")


    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Test 1: Health check
        print("\n2. Testing GET /health...")
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("Health check OK:", res.json())

        # Test 2: Register Patient
        print("\n3. Testing POST /api/v1/auth/register/patient...")
        patient_payload = {
            "name": "Alice Patient",
            "email": "alice@example.com",
            "phone": "+250788000111",
            "password": "Password123!",
            "age": 28,
            "gender": "female",
            "district": "Gasabo",
            "sector": "Kimironko"
        }
        res = await client.post("/api/v1/auth/register/patient", json=patient_payload)
        assert res.status_code == 201, f"Patient registration failed: {res.text}"
        patient_data = res.json()
        print("Patient Registered:", patient_data["id"], patient_data["name"], patient_data["role"])

        # Test 3: Register Doctor
        print("\n4. Testing POST /api/v1/auth/register/doctor...")
        doctor_payload = {
            "name": "Dr. Eric Mugisha",
            "email": "dr.eric@example.com",
            "phone": "+250788222333",
            "password": "DoctorPassword123!",
            "specialty": "General Medicine",
            "license_number": "MD-RW-2024-889",
            "experience_years": 8,
            "coverage_districts": ["Gasabo", "Kicukiro"]
        }
        res = await client.post("/api/v1/auth/register/doctor", json=doctor_payload)
        assert res.status_code == 201, f"Doctor registration failed: {res.text}"
        doctor_data = res.json()
        print("Doctor Registered:", doctor_data["id"], doctor_data["name"], doctor_data["role"])

        # Test 4: Login with Email
        print("\n5. Testing POST /api/v1/auth/login (email + password)...")
        login_res = await client.post("/api/v1/auth/login", json={
            "identifier": "alice@example.com",
            "password": "Password123!"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        login_data = login_res.json()
        token = login_data["access_token"]
        print("Login Success! Token generated:", token[:25] + "...")

        # Test 5: Login with Phone
        print("\n6. Testing POST /api/v1/auth/login (phone + password)...")
        login_phone_res = await client.post("/api/v1/auth/login", json={
            "identifier": "+250788000111",
            "password": "Password123!"
        })
        assert login_phone_res.status_code == 200, f"Phone login failed: {login_phone_res.text}"
        print("Phone Login Success!")

        # Test 6: Verify Authenticated Route (GET /me)
        print("\n7. Testing GET /api/v1/auth/me with Bearer token...")
        me_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_res.status_code == 200, f"Get /me failed: {me_res.text}"
        me_data = me_res.json()
        print("Authenticated User Info:", me_data["name"], "(role:", me_data["role"], ")")

        # Test 7: Verify OTP
        print("\n8. Testing POST /api/v1/auth/verify-otp...")
        otp_res = await client.post("/api/v1/auth/verify-otp", json={"code": "123456"})
        assert otp_res.status_code == 200, f"OTP verification failed: {otp_res.text}"
        print("OTP Verified:", otp_res.json())

    print("\nALL BACKEND AUTHENTICATION FLOW TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(main())
