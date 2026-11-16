from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import verify_password, create_access_token, generate_csrf_token
from app.db.session import get_db
from app.db.models import User
from app.db.schemas import LoginRequest, Token, UserResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticates user, sets HttpOnly JWT and CSRF cookies, and returns user summary.
    """
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalars().first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact Principal/Admin.",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()

    # Create Access Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        expires_delta=access_token_expires
    )

    # Generate CSRF token
    csrf_token = generate_csrf_token()

    # Set Secure HttpOnly Cookies
    cookie_kwargs = {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
        "max_age": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "path": "/"
    }

    # 1. JWT auth cookie (HttpOnly)
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=access_token,
        **cookie_kwargs
    )

    # 2. CSRF cookie (also readable via cookie/header for defense-in-depth)
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf_token,
        httponly=False, # Accessible to frontend JavaScript to attach to X-CSRF-Token header
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        full_name=user.full_name,
        email=user.email
    )

@router.post("/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    """
    Clears authentication cookies and invalidates session.
    """
    response.delete_cookie(key=settings.COOKIE_NAME, path="/")
    response.delete_cookie(key=settings.CSRF_COOKIE_NAME, path="/")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns verified profile of currently logged-in user.
    """
    return current_user

