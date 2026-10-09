from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenRefreshRequest, TokenResponse, UserRegister
from app.schemas.user import UserRead
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    user_in: UserRegister,
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    user = await auth_service.register(db, user_in=user_in)
    return UserRead.model_validate(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and receive access and refresh tokens",
)
async def login(
    login_in: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await auth_service.authenticate(
        db,
        identifier=login_in.username_or_email,
        password=login_in.password,
    )
    return auth_service.generate_tokens(user.id)


@router.post(
    "/admin/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate administrative user exclusively",
)
async def admin_login(
    login_in: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await auth_service.authenticate(
        db,
        identifier=login_in.username_or_email,
        password=login_in.password,
    )
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Administrative privileges required.",
        )
    return auth_service.generate_tokens(user.id)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Exchange a refresh token for new access and refresh tokens",
)
async def refresh_token(
    refresh_in: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await auth_service.refresh_token(db, refresh_token_str=refresh_in.refresh_token)


@router.get(
    "/me",
    response_model=UserRead,
    status_code=status.HTTP_200_OK,
    summary="Get profile of the currently authenticated user",
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserRead:
    return UserRead.model_validate(current_user)
