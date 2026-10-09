from app.crud.base import CRUDBase
from app.crud.badge import crud_badge
from app.crud.carbon_record import crud_carbon_record
from app.crud.challenge import crud_challenge
from app.crud.submission import crud_submission
from app.crud.user import crud_user

__all__ = [
    "CRUDBase",
    "crud_user",
    "crud_challenge",
    "crud_carbon_record",
    "crud_badge",
    "crud_submission",
]
