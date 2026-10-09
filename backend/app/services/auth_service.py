from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.crud.user import crud_user
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import TokenResponse, UserRegister
from app.schemas.user import UserUpdate


class AuthService:
    async def register(self, db: AsyncSession, user_in: UserRegister) -> User:
        # Check email uniqueness
        existing_email = await crud_user.get_by_email(db, user_in.email)
        if existing_email:
            raise ConflictException(detail="Email is already registered", code="EMAIL_ALREADY_EXISTS")

        # Check username uniqueness
        existing_username = await crud_user.get_by_username(db, user_in.username)
        if existing_username:
            raise ConflictException(detail="Username is already taken", code="USERNAME_ALREADY_EXISTS")

        hashed_password = get_password_hash(user_in.password)
        user_data = {
            "email": user_in.email.strip().lower(),
            "username": user_in.username.strip(),
            "hashed_password": hashed_password,
            "role": UserRole.USER,
            "eco_points": 0,
            "is_active": True,
        }
        return await crud_user.create(db, obj_in=user_data)

    async def authenticate(
        self, db: AsyncSession, identifier: str, password: str
    ) -> User:
        user = await crud_user.get_by_identifier(db, identifier)
        if not user:
            raise UnauthorizedException(detail="Invalid credentials", code="INVALID_CREDENTIALS")

        if not verify_password(password, user.hashed_password):
            raise UnauthorizedException(detail="Invalid credentials", code="INVALID_CREDENTIALS")

        if not user.is_active:
            raise UnauthorizedException(detail="User account is deactivated", code="USER_INACTIVE")

        return user

    def generate_tokens(self, user_id: int) -> TokenResponse:
        access_token = create_access_token(subject=user_id)
        refresh_token = create_refresh_token(subject=user_id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
        )

    async def refresh_token(self, db: AsyncSession, refresh_token_str: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token_str)
        except Exception:
            raise UnauthorizedException(detail="Invalid or expired refresh token", code="INVALID_REFRESH_TOKEN")

        if payload.get("type") != "refresh":
            raise UnauthorizedException(detail="Provided token is not a refresh token", code="INVALID_TOKEN_TYPE")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException(detail="Token payload missing subject", code="INVALID_TOKEN_PAYLOAD")

        user = await crud_user.get(db, int(user_id))
        if not user or not user.is_active:
            raise UnauthorizedException(detail="User not found or inactive", code="USER_NOT_FOUND")

        return self.generate_tokens(user.id)

    async def update_profile(
        self, db: AsyncSession, user: User, update_in: UserUpdate
    ) -> User:
        data: Dict[str, Any] = {}
        if update_in.username is not None:
            new_username = update_in.username.strip()
            if new_username.lower() != user.username.lower():
                existing = await crud_user.get_by_username(db, new_username)
                if existing:
                    raise ConflictException(detail="Username already taken", code="USERNAME_TAKEN")
            data["username"] = new_username

        if update_in.avatar_url is not None:
            data["avatar_url"] = update_in.avatar_url

        if update_in.password is not None:
            if len(update_in.password) < 8:
                raise BadRequestException(
                    detail="Password must be at least 8 characters long",
                    code="PASSWORD_TOO_SHORT",
                )
            data["hashed_password"] = get_password_hash(update_in.password)

        if not data:
            return user

        return await crud_user.update(db, db_obj=user, obj_in=data)

    async def get_stats(self, db: AsyncSession, user_id: int) -> Dict[str, Any]:
        return await crud_user.get_user_stats(db, user_id)


auth_service = AuthService()
