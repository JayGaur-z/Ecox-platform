import enum


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_lower = value.lower()
            for member in cls:
                if member.value == val_lower:
                    return member
        return None


class ChallengeCategory(str, enum.Enum):
    TRANSPORT = "transport"
    ENERGY = "energy"
    WASTE = "waste"
    WATER = "water"
    FOOD = "food"
    OTHER = "other"


class ChallengeDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class SubmissionStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    FLAGGED = "FLAGGED"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            val_upper = value.upper()
            if val_upper in ("PENDING", "PENDING_REVIEW"):
                return cls.PENDING_REVIEW
            if val_upper == "APPROVED":
                return cls.APPROVED
            if val_upper == "REJECTED":
                return cls.REJECTED
            if val_upper == "FLAGGED":
                return cls.FLAGGED
            for member in cls:
                if member.value.upper() == val_upper:
                    return member
        return None


# Backward-compatible alias
SubmissionStatus.PENDING = SubmissionStatus.PENDING_REVIEW


class VerificationCheckStatus(str, enum.Enum):
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


class CarbonSource(str, enum.Enum):
    SELF_REPORTED = "self_reported"
    VERIFIED_CHALLENGE = "verified_challenge"


class CarbonDirection(str, enum.Enum):
    EMISSION = "emission"
    SAVING = "saving"


class BadgeCriteriaType(str, enum.Enum):
    POINTS_TOTAL = "points_total"
    CO2_SAVED_TOTAL = "co2_saved_total"
    SUBMISSIONS_APPROVED = "submissions_approved"
    STREAK_DAYS = "streak_days"
    COMPETITION_WIN = "competition_win"


class CompetitionMetric(str, enum.Enum):
    POINTS = "points"
    CO2_SAVED = "co2_saved"


class CompetitionStatus(str, enum.Enum):
    UPCOMING = "upcoming"
    ACTIVE = "active"
    FINISHED = "finished"
