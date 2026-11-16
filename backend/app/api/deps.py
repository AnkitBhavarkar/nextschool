from typing import Optional
from fastapi import Depends, HTTPException, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError
from app.core.config import settings
from app.core.security import verify_csrf_token
from app.db.session import get_db
from app.db.models import User, Teacher

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Extracts and validates JWT from HttpOnly cookie, returning the verified User model.
    """
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        # Fallback to Authorization Bearer header for Swagger docs / testing
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not found in request",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account")
        
    return user

def require_role(required_role: str):
    """
    Dependency generator enforcing strict Role-Based Access Control (RBAC).
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires '{required_role}' privilege."
            )
        return current_user
    return role_checker

async def verify_csrf(
    request: Request,
    x_csrf_token: Optional[str] = Header(None, alias="X-CSRF-Token")
):
    """
    Validates CSRF token header against HttpOnly CSRF cookie for mutative requests.
    """
    # Safe methods do not require CSRF
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return True
    
    # Check if request has an authorization header with Bearer token (API client/testing exemption)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return True

    if not verify_csrf_token(request, x_csrf_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF validation failed: missing or invalid X-CSRF-Token"
        )
    return True

