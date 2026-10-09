from app.schemas.auth import LoginRequest, TokenRefreshRequest, TokenResponse, UserRegister
from app.schemas.badge import BadgeCreate, BadgeRead, BadgeUpdate, UserBadgeRead
from app.schemas.carbon import (
    CarbonRecordCreate,
    CarbonRecordRead,
    CarbonSummary,
    CarbonTimeseriesPoint,
    CategoryTotal,
)
from app.schemas.challenge import (
    ChallengeCreate,
    ChallengeRead,
    ChallengeUpdate,
    VerificationRequirements,
)
from app.schemas.common import ErrorResponse, HealthResponse, Page
from app.schemas.competition import CompetitionCreate, CompetitionRead, LeaderboardEntry
from app.schemas.submission import EvidenceSummary, SubmissionCreate, SubmissionRead, SubmissionReviewRequest
from app.schemas.user import UserAdminUpdate, UserBase, UserRead, UserStats, UserUpdate

__all__ = [
    # Common
    "Page",
    "ErrorResponse",
    "HealthResponse",
    # Auth
    "UserRegister",
    "LoginRequest",
    "TokenResponse",
    "TokenRefreshRequest",
    # User
    "UserBase",
    "UserUpdate",
    "UserAdminUpdate",
    "UserRead",
    "UserStats",
    # Challenge
    "VerificationRequirements",
    "ChallengeCreate",
    "ChallengeUpdate",
    "ChallengeRead",
    # Carbon
    "CarbonRecordCreate",
    "CarbonRecordRead",
    "CategoryTotal",
    "CarbonSummary",
    "CarbonTimeseriesPoint",
    # Badge
    "BadgeCreate",
    "BadgeUpdate",
    "BadgeRead",
    "UserBadgeRead",
    # Submission
    "SubmissionCreate",
    "SubmissionRead",
    "SubmissionReviewRequest",
    "EvidenceSummary",
    # Competition & Leaderboard
    "CompetitionCreate",
    "CompetitionRead",
    "LeaderboardEntry",
]
