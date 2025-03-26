from enum import Enum
from beanie import Document, PydanticObjectId, Indexed, Link
from datetime import datetime
from typing import Optional
from pydantic import EmailStr
from models.user import AccountType, User
from pydantic import BaseModel

class BillingCycle(Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class Subscription(Document):
    """Subscription DB representation."""
    user_id: Link[User]  
    account_type: AccountType = AccountType.FREE  # Tracks the subscribed tier
    billing_cycle: Optional[BillingCycle] = None  # Monthly or yearly
    start_date: datetime  # When the subscription began
    end_date: datetime  # When it expires
    active: bool = True  # Is the subscription currently active?


class ToggleTier(BaseModel):
    account_type: AccountType
    billing_cycle: Optional[BillingCycle] = None 