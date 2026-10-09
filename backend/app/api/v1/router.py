from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.badges import router as badges_router
from app.api.v1.carbon import router as carbon_router
from app.api.v1.challenges import router as challenges_router
from app.api.v1.leaderboard import router as leaderboard_router
from app.api.v1.submissions import router as submissions_router
from app.api.v1.users import router as users_router
from app.schemas.common import HealthResponse

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(challenges_router)
api_router.include_router(submissions_router)
api_router.include_router(carbon_router)
api_router.include_router(badges_router)
api_router.include_router(leaderboard_router)


@api_router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", version="1.0.0")
