import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.models import User, Teacher, UserRole

logger = logging.getLogger(__name__)

async def bootstrap_initial_users(db: AsyncSession):
    """
    Idempotent bootstrap process to ensure an initial Admin and Teacher account
    exist from configured environment variables without using predictable default passwords.
    """
    # 1. Bootstrap Admin
    if settings.BOOTSTRAP_ADMIN_EMAIL and settings.BOOTSTRAP_ADMIN_PASSWORD:
        result = await db.execute(select(User).where(User.email == settings.BOOTSTRAP_ADMIN_EMAIL))
        admin = result.scalars().first()
        if not admin:
            admin = User(
                email=settings.BOOTSTRAP_ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.BOOTSTRAP_ADMIN_PASSWORD),
                full_name=settings.BOOTSTRAP_ADMIN_NAME,
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            await db.commit()
            logger.info(f"Bootstrapped initial Admin user: {settings.BOOTSTRAP_ADMIN_EMAIL}")

    # 2. Bootstrap Teacher
    if settings.BOOTSTRAP_TEACHER_EMAIL and settings.BOOTSTRAP_TEACHER_PASSWORD:
        result = await db.execute(select(User).where(User.email == settings.BOOTSTRAP_TEACHER_EMAIL))
        teacher_user = result.scalars().first()
        if not teacher_user:
            teacher_user = User(
                email=settings.BOOTSTRAP_TEACHER_EMAIL,
                hashed_password=get_password_hash(settings.BOOTSTRAP_TEACHER_PASSWORD),
                full_name=settings.BOOTSTRAP_TEACHER_NAME,
                role=UserRole.TEACHER,
                is_active=True
            )
            db.add(teacher_user)
            await db.flush()

            # Create teacher profile
            teacher_profile = Teacher(
                user_id=teacher_user.id,
                phone="+919876543210",
                employee_code="TCH-001",
                department="Mathematics & Science"
            )
            db.add(teacher_profile)
            await db.commit()
            logger.info(f"Bootstrapped initial Teacher user: {settings.BOOTSTRAP_TEACHER_EMAIL}")

