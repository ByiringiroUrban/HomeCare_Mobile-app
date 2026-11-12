"""Platform-wide configuration stored in the `platform_settings` table and editable by admins."""
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.domain import PlatformSetting

# Reference defaults written to the database the first time the API starts.
# After that the database is the source of truth (admins edit them via /admin/config).
DEFAULT_PLATFORM_CONFIG: dict[str, Any] = {
    "platformName": "HomeCare",
    "operatingRegion": "East Africa",
    "supportEmail": "",
    "supportPhone": "",
    "emergencyPhone": "912",
    "emergencyPhones": {"RW": "912", "KE": "999", "TZ": "114"},
    "cancellationWindowHours": 2,
    "defaultConsultationFee": 25000,
    "baseTravelFee": 5000,
    "defaultCurrency": "RWF",
    "coverageDistricts": [
        "Gasabo", "Kicukiro", "Nyarugenge",
        "Nairobi CBD", "Westlands", "Kilimani", "Mombasa Island",
        "Kinondoni", "Ilala", "Temeke", "Arusha City",
    ],
    "languages": ["Kinyarwanda", "English", "French", "Kiswahili"],
    "commonSymptoms": [
        "Fever", "Cough", "Headache", "Fatigue", "Body aches",
        "Nausea", "Diarrhea", "Shortness of breath", "Chest pain", "Skin rash",
    ],
    "labPartners": [],
    "regulatoryNotice": "",
}


async def ensure_platform_defaults(db: AsyncSession) -> None:
    result = await db.execute(select(PlatformSetting.key))
    existing = set(result.scalars().all())
    for key, value in DEFAULT_PLATFORM_CONFIG.items():
        if key not in existing:
            db.add(PlatformSetting(key=key, value=value))
    await db.commit()


async def get_platform_config(db: AsyncSession) -> dict[str, Any]:
    result = await db.execute(select(PlatformSetting))
    config = dict(DEFAULT_PLATFORM_CONFIG)
    for row in result.scalars().all():
        config[row.key] = row.value
    return config


async def update_platform_config(db: AsyncSession, changes: dict[str, Any]) -> dict[str, Any]:
    result = await db.execute(select(PlatformSetting).where(PlatformSetting.key.in_(list(changes.keys()))))
    rows = {row.key: row for row in result.scalars().all()}
    for key, value in changes.items():
        if key in rows:
            rows[key].value = value
        else:
            db.add(PlatformSetting(key=key, value=value))
    await db.commit()
    return await get_platform_config(db)
