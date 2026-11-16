from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional

from app.db.session import get_db
from app.db.models import School, User
from app.api.deps import require_role

router = APIRouter()

class SchoolWhatsAppConfigUpdate(BaseModel):
    official_phone_number: str
    phone_number_id: str
    waba_id: str
    meta_access_token: str
    is_active: bool = True

@router.get("/whatsapp-config")
async def get_school_whatsapp_config(
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns current School WhatsApp Business API connection settings for Admin.
    Masks the access token for security.
    """
    school = (await db.execute(select(School))).scalars().first()
    if not school:
        school = School(
            school_name="NextSchool Official",
            official_phone_number="+919876500000",
            phone_number_id="",
            waba_id="",
            meta_access_token="",
            is_active=False
        )
        db.add(school)
        await db.commit()
        await db.refresh(school)

    token_display = ""
    if school.meta_access_token:
        token_display = school.meta_access_token[:6] + "..." + school.meta_access_token[-4:]

    return {
        "id": school.id,
        "school_name": school.school_name,
        "official_phone_number": school.official_phone_number,
        "phone_number_id": school.phone_number_id,
        "waba_id": school.waba_id,
        "is_connected": bool(school.phone_number_id and school.meta_access_token and school.is_active),
        "is_active": school.is_active,
        "token_preview": token_display
    }

@router.post("/whatsapp-config")
async def update_school_whatsapp_config(
    payload: SchoolWhatsAppConfigUpdate,
    admin_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin connects or updates the centralized WhatsApp Business API credentials.
    All teachers will automatically dispatch through these credentials.
    """
    school = (await db.execute(select(School))).scalars().first()
    if not school:
        school = School(school_name="NextSchool Official")
        db.add(school)

    school.official_phone_number = payload.official_phone_number.strip()
    school.phone_number_id = payload.phone_number_id.strip()
    school.waba_id = payload.waba_id.strip()
    school.meta_access_token = payload.meta_access_token.strip()
    school.is_active = payload.is_active

    await db.commit()
    await db.refresh(school)

    return {
        "success": True,
        "message": "School WhatsApp Business API configuration updated successfully! Teachers can now send notifications through this number."
    }

