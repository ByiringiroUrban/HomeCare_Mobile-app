import asyncio
from sqlalchemy.future import select
from app.db.session import engine, Base, AsyncSessionLocal
from app.models.user import User, PatientProfile, DoctorProfile, UserRole, DoctorVerificationStatus
from app.core.security import get_password_hash


async def seed():
    print("=" * 60)
    print("[HomeCare Seed] Initializing tables in Neon PostgreSQL...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if users already exist
        res = await session.execute(select(User))
        existing_users = res.scalars().all()
        if existing_users:
            print(f"[HomeCare Seed] Database already contains {len(existing_users)} users.")
            for u in existing_users:
                print(f" - [{u.role.value.upper()}] {u.name} | Email: {u.email} | Phone: {u.phone}")
            print("=" * 60)
            return

        print("[HomeCare Seed] Seeding core users into Neon database...")

        # 1. Real Patient Account
        patient = User(
            id="usr-patient-001",
            name="Diane Uwase",
            email="diane.uwase@example.rw",
            phone="+250788412901",
            hashed_password=get_password_hash("Password123!"),
            role=UserRole.PATIENT,
            avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80",
        )
        session.add(patient)
        await session.flush()

        patient_profile = PatientProfile(
            user_id=patient.id,
            age=31,
            gender="female",
            residence_address="KG 14 Ave, House 24, Kibagabaga",
            district="Gasabo",
            sector="Kibagabaga",
            allergies=["Penicillin"],
            known_conditions=["Mild Asthma"],
            current_medication=["Ventolin Inhaler PRN"],
        )
        session.add(patient_profile)

        # 2. Real Doctor Account
        doctor = User(
            id="usr-doctor-001",
            name="Dr. Eric Kayitare",
            email="dr.eric@homecare.rw",
            phone="+250788102304",
            hashed_password=get_password_hash("Doctor123!"),
            role=UserRole.DOCTOR,
            avatar_url="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80",
        )
        session.add(doctor)
        await session.flush()

        doctor_profile = DoctorProfile(
            user_id=doctor.id,
            specialty="General Medicine",
            license_number="RMDC/2019/G-8821",
            experience_years=8,
            qualifications=["MBChB (University of Rwanda)", "BLS/ACLS Certified"],
            coverage_districts=["Gasabo", "Kicukiro", "Nyarugenge"],
            bio="Senior resident physician with 8 years clinical experience in home consultation, chronic disease management, and emergency stabilization.",
            languages=["English", "Kinyarwanda", "French"],
            consultation_fee_rwf=25000,
            travel_fee_rwf=5000,
            rating=5,
            review_count=34,
            verification_status=DoctorVerificationStatus.APPROVED,
        )
        session.add(doctor_profile)

        # 3. Real Admin Account
        admin = User(
            id="usr-admin-001",
            name="Jean Bosco Nkurunziza",
            email="admin@homecare.rw",
            phone="+250788999000",
            hashed_password=get_password_hash("AdminHomeCare2026!"),
            role=UserRole.ADMIN,
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
        )
        session.add(admin)

        await session.commit()
        print("[HomeCare Seed] SUCCESS: 3 core roles seeded into Neon PostgreSQL!")
        print("  1. PATIENT: Diane Uwase          (diane.uwase@example.rw / Password123!)")
        print("  2. DOCTOR:  Dr. Eric Kayitare    (dr.eric@homecare.rw / Doctor123!)")
        print("  3. ADMIN:   Jean Bosco (Admin)   (admin@homecare.rw / AdminHomeCare2026!)")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
