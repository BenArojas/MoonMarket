"""User models."""

from datetime import datetime, timezone
from typing import Annotated, Any, Optional, List, TYPE_CHECKING
from beanie import Document, Indexed, PydanticObjectId, Link
from pydantic import BaseModel, EmailStr, Field
from fastapi import Request
from cache.manager import CacheManager
from secrets import token_urlsafe
from models.schemas import CachedUser, Deposit, Holding, YearlyExpenses
from enum import Enum

if TYPE_CHECKING:
    from .friendRequest import FriendRequest


class AccountType(Enum):
    FREE = "free"
    PREMIUM = "premium"


class ApiKeyRequest(BaseModel):
    api_key: str
    tax_rate: float


class UserAuth(BaseModel):
    """User login auth."""

    email: str
    password: str


class UserRegister(UserAuth):
    """User register."""

    deposits: List[Deposit] = Field(..., min_items=1)
    username: str


class UserFriend(BaseModel):
    """User fields that will be shown when searching a user"""

    email: str
    username: str


class FriendShow(UserFriend):
    request_id: Optional[str] = None


class UserUpdate(BaseModel):
    """Updatable user fields."""

    email: Annotated[str, Indexed(EmailStr, unique=True)]
    holdings: List[Holding] = []
    transactions: List[PydanticObjectId] = []
    deposits: List[Deposit] | None = []
    current_balance: float | None = 0
    profit: float | None = 0
    last_refresh: datetime | None = None
    username: Optional[str] = None
    enabled: bool
    yearly_expenses: List[YearlyExpenses] = []
    account_type: AccountType


class UserOut(UserUpdate):
    """User fields returned to the client."""
    id: PydanticObjectId
    friends: List[PydanticObjectId] | None = []


class User(Document):
    """User DB representation."""

    email: Annotated[str, Indexed(EmailStr, unique=True)]
    password: str
    username: Annotated[str, Indexed(str, unique=True)]
    holdings: List[Holding] = []
    transactions: List[PydanticObjectId] = []
    deposits: List[Deposit] = []
    current_balance: float = 0
    profit: float = 0
    last_refresh: Optional[datetime] = None
    friends: List[PydanticObjectId] = []
    friend_requests_sent: List[Link["FriendRequest"]] = []
    friend_requests_received: List[Link["FriendRequest"]] = []
    enabled: bool = False
    session: Optional[str] = None
    last_activity: Optional[datetime] = None
    tax_rate: float = 0
    yearly_expenses: List[YearlyExpenses] = []
    account_type: AccountType = AccountType.FREE

    @classmethod
    async def by_session(cls, session: str, request: Request) -> Optional["User"]:
        cache_manager = CacheManager(request)
        cached_data = await cache_manager.get_user_by_session(session)

        if cached_data:
            # Query DB just for sensitive data
            user = await cls.find_one({"session": session})
            if not user:
                return None

            # Convert to CachedUser - Pydantic will automatically handle nested datetime conversions
            # because our models (Holding, Deposit, YearlyExpenses) have datetime fields defined
            cached_user = CachedUser.model_validate(cached_data)

            # Update user with cached data
            user_dict = cached_user.model_dump(exclude_unset=True)
            for key, value in user_dict.items():
                if hasattr(user, key):
                    setattr(user, key, value)

            return user

    # Session management methods
    async def create_session(self, request: Request) -> str:
        """Create a new session for the user with caching."""

        self.session = token_urlsafe(32)
        self.last_activity = datetime.now(timezone.utc)
        await self.save()

        # Add caching
        cache_manager = CacheManager(request)
        await cache_manager.cache_user(self)

        return self.session

    async def end_session(self, request: Request) -> None:
        """End the user's current session and clear cache."""
        # Clear cache first
        cache_manager = CacheManager(request)
        await cache_manager.invalidate_user(self)

        self.session = None
        await self.save()

    async def refresh_cache(self, request: Request) -> None:
        """Refresh user's cache data from DB while preserving session."""
        current_session = self.session

        # Get fresh data from DB
        fresh_user = await User.find_one(User.id == self.id)
        if fresh_user and current_session:
            fresh_user.session = current_session
            cache_manager = CacheManager(request)
            await cache_manager.cache_user(fresh_user)

    async def update_last_activity(self, request: Request) -> None:
        """Update the user's last activity timestamp with caching."""
        self.last_activity = datetime.now(timezone.utc)

        # Update cache first for better read performance
        cache_manager = CacheManager(request)
        await cache_manager.cache_user(self)

        await self.save()

    # Friend-related methods
    async def add_friend(self, id: PydanticObjectId):
        self.friends.append(id)
        await self.save()

    async def remove_friend(self, friend: "User"):
        if friend.id in self.friends:
            self.friends.remove(friend.id)
            await self.save()

    async def send_friend_request(self, to_user: "User", request):
        from .friendRequest import FriendRequest

        friend_request = FriendRequest(from_user=self, to_user=to_user)
        await friend_request.create()
        self.friend_requests_sent.append(friend_request)
        to_user.friend_requests_received.append(friend_request)
        await self.save()
        await to_user.save()
        cache_manager = CacheManager(request)
        await cache_manager.cache_user(self)

    async def accept_friend_request(
        self, request: "FriendRequest", from_user: "User", http_request: Request
    ):
        if request.status == "pending":
            request.status = "accepted"
            if from_user.id in self.friends or self.id in from_user.friends:
                await request.save()
                return {"message": "Already friends"}
            else:
                await self.add_friend(from_user.id)
                await from_user.add_friend(self.id)
            await request.save()
            cache_manager = CacheManager(http_request)
            await cache_manager.cache_user(self)

    async def reject_friend_request(
        self, request: "FriendRequest", from_user: "User", http_request: Request
    ):
        if request.status == "pending":
            request.status = "rejected"
            await request.save()

    # Existing utility methods
    @property
    def created(self) -> datetime | None:
        return self.id.generation_time if self.id else None

    @classmethod
    async def by_email(cls, email: str) -> Optional["User"]:
        return await cls.find_one({"email": email})

    @classmethod
    async def by_username(cls, username: str) -> Optional["User"]:
        return await cls.find_one({"username": username})

    # Standard Python methods
    def __repr__(self) -> str:
        return f"<User {self.email}>"

    def __str__(self) -> str:
        return self.email

    def display(self) -> str:
        return f"User ID: {self.id}, Email: {self.email}"

    def __hash__(self) -> int:
        return hash(self.email)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, User):
            return self.email == other.email
        return False


class PasswordChangeRequest(BaseModel):
    password: str
    new_password: str
