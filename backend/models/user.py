"""User models."""

from datetime import datetime
from typing import Annotated, Any, Optional, List, Optional, TYPE_CHECKING
from beanie import Document, Indexed, PydanticObjectId, Link
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId
from fastapi import  HTTPException

if TYPE_CHECKING:
    from .friendRequest import FriendRequest

class Deposit(BaseModel):
    amount: float
    date: datetime

class Holding(BaseModel):
    ticker: str
    avg_bought_price: float
    quantity: int
    position_started: datetime
    
    class Config:
        json_schema_extra = {
            "example": {
                "ticker": "AAPL",
                "avg_bought_price": 150,
                "quantity": 40,
                "position_started": "2024-04-30T08:24:12"
            }
        }
        

class UserAuth(BaseModel):
    """User login auth."""

    email: Annotated[str, Indexed(EmailStr, unique=True)]
    password: str

class UserRegister(UserAuth):
    """User register."""

    deposits: List[Deposit] = Field(..., min_items=1)  # At least one deposit required
    username: str
    
    
class UserFriend(BaseModel):
    """User fields that will be shown when searching a user in order to send a friend request"""
     

# Update FriendShow to include request_id
class FriendShow(UserFriend):
    request_id: Optional[str] = None
    


class UserUpdate(BaseModel):
    """Updatable user fields."""

    email: Annotated[str, Indexed(EmailStr, unique=True)]
    holdings: List[Holding] = []
    transactions: List[PydanticObjectId] = []  # Use PydanticObjectId for transactions
    deposits: List[Deposit] | None = []
    current_balance: float | None = 0
    last_refresh: datetime | None = None
    username: Optional[str] = None
    
class UserOut(UserUpdate):
    """User fields returned to the client."""
    friends: List[UserFriend] = []

class User(Document):
    """User DB representation."""

    email: Annotated[str, Indexed(EmailStr, unique=True)]
    password: str
    username: Optional[str] = None
    holdings: List[Holding] = []
    transactions: List[PydanticObjectId] = []
    deposits: List[Deposit] = []
    current_balance: float = 0
    last_refresh: Optional[datetime] = None
    friends: List[PydanticObjectId] = []
    friend_requests_sent: List[Link["FriendRequest"]] = []
    friend_requests_received: List[Link["FriendRequest"]] = []
    
    async def add_friend(self, id: PydanticObjectId):
        self.friends.append(id)
        await self.save()

    async def remove_friend(self, friend: "User"):
        if friend.id in self.friends:
            self.friends.remove(friend.id)
            await self.save()

    async def send_friend_request(self, to_user: "User"):
        from .friendRequest import FriendRequest
        friend_request = FriendRequest(from_user=self, to_user=to_user)
        await friend_request.create()
        self.friend_requests_sent.append(friend_request)
        to_user.friend_requests_received.append(friend_request)
        await self.save()
        await to_user.save()

    async def accept_friend_request(self, request: "FriendRequest", from_user: "User"):
            if request.status == "pending":
                # Update request status
                request.status = "accepted"

                # Add friends
                if from_user.id in self.friends or self.id in from_user.friends:
                    await request.save()
                    return {"message": "Already friends"}
                else:
                    await self.add_friend(from_user.id)
                    await from_user.add_friend(self.id)
                    
                await request.save()

    async def reject_friend_request(self, request: "FriendRequest", from_user: "User"):
        if request.status == "pending":
            # Update request status
            request.status = "rejected"
            await request.save()


    def __repr__(self) -> str:
        return f"<User {self.email}>"
    
    def __str__(self) -> str:
        return self.email

    def __hash__(self) -> int:
        return hash(self.email)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, User):
            return self.email == other.email
        return False

    @property
    def created(self) -> datetime | None:
        """Datetime user was created from ID."""
        return self.id.generation_time if self.id else None

    @property
    def jwt_subject(self) -> dict[str, Any]:
        """JWT subject fields."""
        return {"username": self.email}

    @classmethod
    async def by_email(cls, email: str) -> Optional["User"]:
        """Get a user by email."""
        return await cls.find_one({"email": email})

    def update_email(self, new_email: str) -> None:
        """Update email logging and replace."""
        # Add any pre-checks here
        self.email = new_email

class PasswordChangeRequest(BaseModel):
    password: str
    new_password: str


