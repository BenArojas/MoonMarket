from typing import TYPE_CHECKING, List, Optional
from datetime import datetime
from beanie import Document, Link
from pydantic import  Field
from enum import Enum

if TYPE_CHECKING:
    from models.user import User

class FriendRequest(Document):
    status: str = "pending"  # Can be "pending", "accepted", or "rejected"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    from_user: Link["User"]
    to_user: Link["User"]
    

class FriendRequestAnswer(str, Enum):
    accept = "accept"
    reject = "reject"
