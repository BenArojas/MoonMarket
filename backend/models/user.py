"""User models."""

from datetime import datetime, timezone
from typing import Annotated, Any, Optional, List, TYPE_CHECKING
from beanie import Document, Indexed, PydanticObjectId, Link
from pydantic import BaseModel, EmailStr, Field, validator
from fastapi import Request
from secrets import token_urlsafe
from models.schemas import CachedUser, Deposit, Holding, YearlyExpenses
from enum import Enum

if TYPE_CHECKING:
    from .friendRequest import FriendRequest
    from cache.manager import CacheManager


class AccountType(Enum):
    FREE = "free"
    PREMIUM = "premium"

class ApiProvider(str, Enum): 
    IBKR = "ibkr"
    FMP = "fmp" # Let's be specific, as "other" is vague if you add more later
    
class AccountSetupRequest(BaseModel):
    api_provider: ApiProvider # 'fmp' or 'ibkr'
    tax_rate: float
    api_key: Optional[str] = None # Optional: only provided if api_provider is 'fmp'

    @validator('api_key', always=True)
    def check_api_key_for_fmp(cls, v, values):
        # 'values' is a dict of other fields in the model
        provider = values.get('api_provider')
        if provider == ApiProvider.FMP and not v:
            raise ValueError('API key is required for FMP provider')
        if provider == ApiProvider.FMP and v and len(v) != 32: # Assuming FMP key is 32 chars
             raise ValueError('FMP API key must be 32 characters')
        return v


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

class WatchListPortfolioStock(BaseModel):
    ticker: str
    quantity: int


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
    watchlist: List[str] = []  # List of stock tickers
    watchlist_portfolio: List[WatchListPortfolioStock] = []  # Simulated portfolio of watchlist stocks with quantities


class UserOut(UserUpdate):
    """User fields returned to the client."""
    id: PydanticObjectId
    friends: List[PydanticObjectId] | None = []


class User(Document):
    """User DB representation."""

    email: Annotated[str, Indexed(EmailStr, unique=True)]
    password: str
    username: Annotated[str, Indexed(str, unique=True)]
    
     # Account Setup & Provider
    api_provider: Optional[ApiProvider] = None # NEW: To store if user chose IBKR or FMP
    enabled: bool = False # This flag indicates if basic setup (API/Provider + Tax) is done
    tax_rate: float = 0.0

    # IBKR Specific OAuth Tokens (Store Encrypted!) - Placeholder for now
    # ibkr_access_token: Optional[str] = None 
    # ibkr_refresh_token: Optional[str] = None
    # ibkr_token_expiry: Optional[datetime] = None
    
    ibkr_is_connected: bool = False # Flag to quickly check IBKR connection status
    ibkr_last_verified: Optional[datetime] = None
    
    holdings: List[Holding]  = Field(default_factory=list)
    transactions: List[PydanticObjectId]  = Field(default_factory=list)
    deposits: List[Deposit]  = Field(default_factory=list)
    current_balance: float = 0
    profit: float = 0
    last_refresh: Optional[datetime] = None
    friends: List[PydanticObjectId] = Field(default_factory=list)
    friend_requests_sent: List[Link["FriendRequest"]]  = Field(default_factory=list)
    friend_requests_received: List[Link["FriendRequest"]]  = Field(default_factory=list)
    session: Optional[str] = None
    last_activity: Optional[datetime] = None
    yearly_expenses: List[YearlyExpenses]  = Field(default_factory=list)
    watchlist: List[str] = Field(default_factory=list)
    watchlist_portfolio: List[WatchListPortfolioStock] = Field(default_factory=list)  # Simulated portfolio of watchlist stocks with quantities
    account_type: AccountType = AccountType.FREE

    @classmethod
    async def by_session(cls, session: str, request: Request) -> Optional["User"]:
        """Retrieve a user by session ID, using cache first then falling back to database."""
        from cache.manager import CacheManager
        
        # Try to get user from cache first
        cache_manager = CacheManager(request)
        cached_user_data = await cache_manager.get_user_by_session(session)
        
        if cached_user_data:
            # Convert cached data back to User object
            return cls(**cached_user_data)

        # If not in cache, look in database
        user = await cls.find_one({"session": session})
        if user:
            # Cache the user for future requests
            await cache_manager.cache_user(user)
            return user
            
        return None

    # Session management methods
    async def create_session(self, request: Request, ttl: int = 3600) -> str:
        """Create a new session for the user and store in cache and database."""
        from cache.manager import CacheManager
        
        # Generate a new session token
        self.session = token_urlsafe(32)
        self.last_activity = datetime.now(timezone.utc)
        await self.save()

        # Cache the session and user data
        cache_manager = CacheManager(request)
        await cache_manager.create_session(self, ttl=ttl)

        return self.session

    async def end_session(self, request: Request) -> None:
        """End the user's current session and clear from cache and database."""
        from cache.manager import CacheManager
        
        if not self.session:
            return
            
        # Clear session from cache first
        cache_manager = CacheManager(request)
        await cache_manager.invalidate_session(self.session)

        # Then clear from database
        self.session = None
        await self.save()

    async def update_last_activity(self, request: Request) -> None:
        """Update the user's last activity timestamp and refresh cache."""
        from cache.manager import CacheManager
        
        self.last_activity = datetime.now(timezone.utc)

        # Update cache first for better read performance
        if self.session:
            cache_manager = CacheManager(request)
            await cache_manager.cache_user(self)

        await self.save()

    async def refresh_cache(self, request: Request) -> None:
        """Refresh user's cache data from DB while preserving session."""
        from cache.manager import CacheManager
        
        if not self.session:
            return
            
        # Get fresh data from DB
        fresh_user = await User.find_one(User.id == self.id)
        if fresh_user:
            fresh_user.session = self.session
            cache_manager = CacheManager(request)
            await cache_manager.cache_user(fresh_user)

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
        from cache.manager import CacheManager

        friend_request = FriendRequest(from_user=self, to_user=to_user)
        await friend_request.create()
        self.friend_requests_sent.append(friend_request)
        to_user.friend_requests_received.append(friend_request)
        await self.save()
        await to_user.save()
        
        # Update cache
        cache_manager = CacheManager(request)
        await cache_manager.cache_user(self)
        await cache_manager.cache_user(to_user)

    async def accept_friend_request(
        self, request: "FriendRequest", from_user: "User", http_request: Request
    ):
        from cache.manager import CacheManager
        
        if request.status == "pending":
            request.status = "accepted"
            if from_user.id in self.friends or self.id in from_user.friends:
                await request.save()
                return {"message": "Already friends"}
            else:
                await self.add_friend(from_user.id)
                await from_user.add_friend(self.id)
            await request.save()
            
            # Update cache
            cache_manager = CacheManager(http_request)
            await cache_manager.cache_user(self)
            await cache_manager.cache_user(from_user)

    async def reject_friend_request(
        self, request: "FriendRequest", from_user: "User", http_request: Request
    ):
        from cache.manager import CacheManager
        
        if request.status == "pending":
            request.status = "rejected"
            await request.save()
            
            # Update cache
            cache_manager = CacheManager(http_request)
            await cache_manager.cache_user(self)
            await cache_manager.cache_user(from_user)

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