"""Idempotent column top-ups for databases created before newer model fields.

`Base.metadata.create_all` creates missing tables but never alters existing ones,
so a database seeded with an older schema is missing columns the models now use.
Every statement below is safe to run on every startup.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

COLUMN_TOP_UPS: tuple[str, ...] = (
    # Account verification state used by the email OTP flow
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN",
    # Patient profile fields
    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS city VARCHAR",
    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS country VARCHAR",
    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR",
    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR",
    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR",
    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS consent_given BOOLEAN",
    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ",
    # Doctor profile fields
    "ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS city VARCHAR",
    "ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS country VARCHAR",
    "ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR",
    "ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN",
    "ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS working_days JSONB",
    "ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS working_hours_start VARCHAR",
    "ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS working_hours_end VARCHAR",
)


async def apply_pending_columns(conn: AsyncConnection) -> int:
    """Add any missing columns. Returns how many statements were attempted."""
    applied = 0
    for statement in COLUMN_TOP_UPS:
        await conn.execute(text(statement))
        applied += 1
    return applied
