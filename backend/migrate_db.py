import asyncio
from app.db.session import engine
from sqlalchemy import text


async def migrate():
    async with engine.begin() as conn:
        print("Migrating doctor_profiles schema...")
        await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS bio VARCHAR;"))
        await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS languages JSON DEFAULT '[]';"))
        await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS consultation_fee_rwf INTEGER DEFAULT 25000;"))
        await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS travel_fee_rwf INTEGER DEFAULT 5000;"))
        await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5;"))
        await conn.execute(text("ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;"))
        print("Schema migration complete!")


if __name__ == "__main__":
    asyncio.run(migrate())
