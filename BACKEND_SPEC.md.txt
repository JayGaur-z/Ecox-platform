<database_architecture>

Conventions (all models): id is an integer PK. Every table has created_at and updated_at (UTC, timezone-aware). Enums are stored as strings (SAEnum(..., native_enum=False)) so the move from SQLite to MySQL needs no migration surgery. Foreign keys use explicit ondelete behavior. Anything that is a lookup key gets an index.

1. User (users)

email String(255), unique, indexed
username String(50), unique, indexed
hashed_password String(255)
role Enum(user, admin), default user
eco_points Integer, default 0 (denormalized running total; the source of truth is approved Submissions)
is_active Boolean, default True
avatar_url String, nullable
Relationships: 1→N Submission, 1→N CarbonRecord, N↔N Badge via UserBadge, N↔N Competition via CompetitionParticipant

2. Challenge (challenges)

title String(150)
description Text
category Enum(transport, energy, waste, water, food, other)
points_reward Integer
co2_saved_kg Float (estimated saving per verified completion)
verification_requirements JSON, e.g. {"photo": true, "gps": true, "qr": false, "timestamp": true}
difficulty Enum(easy, medium, hard)
is_active Boolean
starts_at, ends_at DateTime, nullable
created_by FK → users.id
Relationships: 1→N Submission

3. Submission (submissions): the evidence record for admin review

user_id FK → users.id (indexed)
challenge_id FK → challenges.id (indexed)
status Enum(pending, approved, rejected, flagged), default pending, indexed
photo_url String
latitude, longitude Float, nullable
gps_accuracy_m Float, nullable
captured_at DateTime (device timestamp from the evidence)
qr_payload String, nullable
evidence_meta JSON (EXIF, device info, etc.)
ai_confidence Float, nullable, 0 to 1
ai_notes Text, nullable
gps_check Enum(passed, failed, skipped), timestamp_check Enum(passed, failed, skipped), qr_check Enum(passed, failed, skipped)
reviewed_by FK → users.id, nullable
reviewed_at DateTime, nullable
review_note Text, nullable
points_awarded Integer, default 0
Unique constraint idea: (user_id, challenge_id, captured_at) to block duplicate uploads
Relationships: N→1 User, N→1 Challenge, 1→0..1 CarbonRecord

4. CarbonRecord (carbon_records): the "Measure" and "Improve" data

user_id FK (indexed)
submission_id FK, nullable, unique (set when the record comes from a verified challenge)
source Enum(self_reported, verified_challenge)
category Enum (same as Challenge)
activity_type String(100), e.g. "car_commute"
quantity Float, unit String(20)
co2_kg Float (emitted if self-reported, saved if from a challenge)
direction Enum(emission, saving)
recorded_on Date (indexed)
Relationships: N→1 User, 0..1→1 Submission

5. Badge (badges)

code String(50), unique (stable key for the frontend)
name, description, icon_url
criteria_type Enum(points_total, co2_saved_total, submissions_approved, streak_days, competition_win)
criteria_value Float
Relationships: N↔N User via UserBadge

6. UserBadge (user_badges): association object, not a bare table

user_id FK, badge_id FK (composite PK)
awarded_at DateTime
awarded_for_submission_id FK, nullable

7. Competition (competitions)

name, description
starts_at, ends_at DateTime
scoring_metric Enum(points, co2_saved)
status Enum(upcoming, active, finished) (compute it from dates on read rather than trusting a stored value)
created_by FK → users.id
Relationships: N↔N User via CompetitionParticipant; N↔N Challenge via CompetitionChallenge, optional (restricts which challenges count)

Supporting association tables

competition_participants: competition_id, user_id (composite PK), joined_at, score Float (cached, recalculated on approval)
competition_challenges: competition_id, challenge_id (composite PK)

Relationship summary

User 1→N Submission, User 1→N CarbonRecord
Challenge 1→N Submission
Submission 1→0..1 CarbonRecord
User N↔N Badge (via UserBadge, with extra columns)
User N↔N Competition (via CompetitionParticipant, with extra columns)
Competition N↔N Challenge (via CompetitionChallenge)

Pydantic schemas (Step 2): grouped per resource, with Base, Create, Update, and Read/Response variants. Read models use model_config = ConfigDict(from_attributes=True).

auth: UserRegister (email, username, password with min length 8), LoginRequest, TokenResponse (access_token, refresh_token, token_type), TokenRefreshRequest
user: UserRead (no password), UserUpdate, UserStats (points, total CO2 saved, rank, badge count)
challenge: ChallengeCreate, ChallengeUpdate, ChallengeRead, VerificationRequirements (nested model for the JSON column)
submission: SubmissionCreate (multipart: challenge_id, photo file, lat, lng, accuracy, captured_at, qr_payload), SubmissionRead (includes the check results and AI confidence), SubmissionReviewRequest (decision approve|reject|flag, note), EvidenceSummary (the consolidated view the admin sees)
carbon: CarbonRecordCreate, CarbonRecordRead, CarbonSummary (totals by category and period), CarbonTimeseriesPoint
badge: BadgeRead, UserBadgeRead (badge plus awarded_at)
competition: CompetitionCreate, CompetitionRead, LeaderboardEntry (rank, user, score)
common: Page[T] generic (items, total, page, size), ErrorResponse (detail, code)

</database_architecture>

<api_endpoints>

All routes are prefixed /api/v1. Auth uses a Bearer JWT. Error shape is always {"detail": str, "code": str}.

Auth

Method	Route	Logic
POST	/auth/register	Validate, check email/username uniqueness, hash password (bcrypt/passlib), return UserRead (201)
POST	/auth/login	Verify credentials, return TokenResponse
POST	/auth/refresh	Exchange a refresh token for a new access token
GET	/auth/me	Return the current UserRead (replaces the "current user" LocalStorage key)

Users

Method	Route	Logic
GET	/users/me/stats	Points, CO2 saved, rank, badges
PATCH	/users/me	Update profile fields
GET	/users	Admin only; paginated list
PATCH	/users/{id}	Admin only; change role or deactivate

Challenges

Method	Route	Logic
GET	/challenges	Filters: category, difficulty, is_active; paginated
GET	/challenges/{id}	Detail, including the verification requirements
POST / PATCH / DELETE	/challenges, /challenges/{id}	Admin only; DELETE is a soft delete (is_active=False)

Submissions (the Verify step)

Method	Route	Logic
POST	/submissions	multipart/form-data. Validate the challenge is active, store the photo, run the evidence checks (below), save as pending, return SubmissionRead (201)
POST	/submissions/verify	Admin only. Body is SubmissionReviewRequest plus submission_id. On approve, in a single transaction: set status, award points, create a CarbonRecord, run the badge check, recalculate competition scores. On reject/flag, store the note only
GET	/submissions/me	The user's own history; filter by status
GET	/submissions	Admin only. Review queue, filter by status, challenge_id, flagged-first ordering
GET	/submissions/{id}	Owner or admin. Returns the EvidenceSummary

Evidence-check logic on POST /submissions (these are supporting signals only, and none of them auto-approve):

GPS: compare the coordinates to the challenge's expected location or radius, if one is defined. Low accuracy produces skipped, not failed.
Timestamp: captured_at must fall within the challenge window and not be in the future. The check also looks for a large gap between it and server receipt time.
QR: match qr_payload against the challenge's expected token.
AI: an optional pluggable service that sets ai_confidence and ai_notes. A failure in this service must never block the submission.
Duplicate detection: hash the photo and reject or flag exact repeats.

Carbon (Measure / Improve)

Method	Route	Logic
POST	/carbon/records	Self-reported entry; compute co2_kg from emission factors in services/carbon_calculator.py
GET	/carbon/records	Filters: date range, category, source
GET	/carbon/summary	Totals grouped by category and period (`?period=week
GET	/carbon/timeseries	Data for the improvement chart
DELETE	/carbon/records/{id}	Owner only, and only for self_reported records

Badges

Method	Route	Logic
GET	/badges	All badges
GET	/badges/me	The user's earned badges
POST / PATCH	/badges	Admin only

Competitions

Method	Route	Logic
GET	/competitions	Filter by computed status
GET	/competitions/{id}	Detail
POST	/competitions	Admin only
POST	/competitions/{id}/join	Idempotent join; reject if finished
GET	/competitions/{id}/leaderboard	Ranked LeaderboardEntry list

Leaderboard and misc

Method	Route	Logic
GET	/leaderboard	Global ranking by eco_points
GET	/health	Liveness check

LocalStorage migration hint for the frontend: map each old key to a call. For example, ecox_user becomes GET /auth/me, ecox_submissions becomes GET /submissions/me, and ecox_carbon becomes GET /carbon/records. Keep the JSON field names in snake_case, and have the frontend wrap axios in one client with an interceptor that attaches the JWT.

</api_endpoints>

<directory_structure>

ecox-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app factory, CORS, router mounting, lifespan
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Pydantic Settings (env-driven)
│   │   ├── security.py          # password hashing, JWT encode/decode
│   │   └── exceptions.py        # custom exceptions + handlers
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py              # DeclarativeBase + model imports for Alembic
│   │   ├── session.py           # async engine, sessionmaker
│   │   └── seed.py              # initial challenges, badges, admin user
│   ├── models/
│   │   ├── __init__.py
│   │   ├── mixins.py            # TimestampMixin
│   │   ├── user.py
│   │   ├── challenge.py
│   │   ├── submission.py
│   │   ├── carbon_record.py
│   │   ├── badge.py             # Badge + UserBadge
│   │   └── competition.py       # Competition + association tables
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py            # Page[T], ErrorResponse
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── challenge.py
│   │   ├── submission.py
│   │   ├── carbon.py
│   │   ├── badge.py
│   │   └── competition.py
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── base.py              # generic CRUDBase[Model, Create, Update]
│   │   ├── user.py
│   │   ├── challenge.py
│   │   ├── submission.py
│   │   ├── carbon_record.py
│   │   ├── badge.py
│   │   └── competition.py
│   ├── services/                # business logic that spans multiple CRUD modules
│   │   ├── __init__.py
│   │   ├── verification.py      # GPS/timestamp/QR/AI evidence checks
│   │   ├── reward.py            # points, badge awarding, competition score updates
│   │   ├── carbon_calculator.py # emission factors + calculation
│   │   └── storage.py           # photo storage abstraction (local now, S3 later)
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py              # get_db, get_current_user, require_admin
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py        # aggregates all routers under /api/v1
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── challenges.py
│   │       ├── submissions.py
│   │       ├── carbon.py
│   │       ├── badges.py
│   │       ├── competitions.py
│   │       └── leaderboard.py
│   └── utils/
│       ├── __init__.py
│       ├── geo.py               # haversine distance
│       └── hashing.py           # image hashing for duplicate detection
├── alembic/
│   ├── env.py
│   └── versions/
├── alembic.ini
├── tests/
│   ├── conftest.py              # test DB, client, auth fixtures
│   ├── test_auth.py
│   ├── test_challenges.py
│   ├── test_submissions.py
│   ├── test_verification_service.py
│   ├── test_carbon.py
│   └── test_competitions.py
├── uploads/                     # gitignored; local photo storage
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md

</directory_structure>

<implementation_instructions>

Architecture rules

Dependency direction is strictly routers → services → crud → models. Routers never touch the session directly or write queries. CRUD modules never contain business rules. schemas/ and models/ must never import from each other: conversion happens through from_attributes.
Use async SQLAlchemy 2.0 (AsyncSession, select() style, Mapped[] / mapped_column). Use aiosqlite for dev. Keep the driver in one config value so MySQL (aiomysql/asyncmy) is a one-line change.
Write DB-portable code only: no SQLite-specific or MySQL-specific SQL, and use the generic JSON type. Use Alembic for every schema change from the first commit. Do not rely on create_all outside tests.
Load relationships explicitly with selectinload or joinedload. Never rely on lazy loading in async code.

Security
5. Hash passwords with bcrypt via passlib. Issue short-lived access tokens (about 30 minutes) and longer refresh tokens, both signed with PyJWT (HS256) using a secret from environment settings. No secrets may be hard-coded.
6. Enforce authorization in dependencies (get_current_user, require_admin). Ownership checks (a user may read only their own submissions) happen in the service or router, and return 404 rather than 403 for other users' resources.
7. Validate uploads: allowed MIME types (image/jpeg, image/png, image/webp), a maximum size (e.g. 5 MB), and generated filenames. Never use the client's filename. Serve uploads through a controlled path.
8. Implement CORS middleware with an allow-list of origins from config (the Vite dev origin http://localhost:5173 by default). No wildcard when credentials are used.

Verification and rewards (the core domain)
9. Evidence checks are advisory. Only POST /submissions/verify by an admin can change a submission to approved. Never auto-approve based on AI or GPS results. Record each check's result separately so the admin sees the reasoning.
10. Approval must run in a single DB transaction: update status, award points, create the CarbonRecord, update User.eco_points, evaluate badges, update competition scores. If any step fails, roll back everything.
11. Approval must be idempotent: re-approving an already approved submission returns 409 and awards nothing twice.
12. The AI check is behind an interface in services/verification.py with a no-op default implementation, so the real model can be swapped in later and failures degrade to skipped.

API quality
13. Use /api/v1 versioning and APIRouter(tags=[...]) per resource. Declare response_model on every route and use the correct status codes (201 on create, 204 on delete, 409 on conflict, 422 from Pydantic).
14. Paginate all list endpoints with page and size (capped at 100), and return Page[T].
15. All datetimes are UTC and serialized as ISO 8601. All JSON field names are snake_case.
16. Configuration is read through a single Settings class (pydantic-settings). Provide .env.example with DATABASE_URL, SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES, CORS_ORIGINS, UPLOAD_DIR, and MAX_UPLOAD_MB.

Delivery
17. Build in this order, with tests passing at each stage: (1) config, DB session, base model, Alembic; (2) User and auth; (3) Challenge; (4) Submission, storage, and the verification service; (5) admin review plus the reward service; (6) CarbonRecord; (7) Badge and UserBadge; (8) Competition and leaderboards; (9) seed script.
18. Write pytest tests with httpx.AsyncClient against an in-memory SQLite database. Required coverage: auth flow, role guards, the submission-to-approval transaction (including rollback and idempotency), and the evidence checks.
19. Do not add features beyond this blueprint, and do not rename models, fields, or routes without flagging the change. Where something is ambiguous, choose the simplest option and leave a # TODO(decision): comment.

</implementation_instructions>