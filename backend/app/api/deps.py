from typing import AsyncGenerator
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.crud.user import crud_user
from app.db.session import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User

security_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that yields an async database session.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency that authenticates JWT Bearer tokens and returns the current User.
    """
    if not auth or not auth.credentials:
        raise UnauthorizedException(
            detail="Authentication credentials were not provided",
            code="MISSING_CREDENTIALS",
        )

    token = auth.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise UnauthorizedException(
            detail="Could not validate credentials",
            code="INVALID_TOKEN",
        )

    if payload.get("type") != "access":
        raise UnauthorizedException(
            detail="Invalid token type",
            code="INVALID_TOKEN_TYPE",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException(
            detail="Token missing user identity",
            code="INVALID_TOKEN_SUBJECT",
        )

    user = await crud_user.get(db, int(user_id))
    if not user:
        raise UnauthorizedException(
            detail="User no longer exists",
            code="USER_NOT_FOUND",
        )

    if not user.is_active:
        raise UnauthorizedException(
            detail="User account is deactivated",
            code="USER_INACTIVE",
        )

    return user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency that verifies the current user has the ADMIN role.
    """
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException(
            detail="Administrator access is required for this action",
            code="ADMIN_REQUIRED",
        )
    return current_user
