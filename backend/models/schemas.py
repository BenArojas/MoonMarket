"""Shared schemas for models."""
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, EmailStr
from beanie import PydanticObjectId

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

class YearlyExpenses(BaseModel):
    """Represents commission and tax expenses for a specific year"""
    year: int
    commission_paid: float = 0
    taxes_paid: float = 0

class CachedUser(BaseModel):
    """User representation for caching, excluding sensitive data."""
    email: str
    username: str
    holdings: List[Holding] = []
    transactions: List[PydanticObjectId] = []
    deposits: List[Deposit] = []
    current_balance: float = 0
    profit: float = 0
    last_refresh: Optional[datetime] = None
    friends: List[PydanticObjectId] = []
    enabled: bool = False
    session: Optional[str] = None
    last_activity: Optional[datetime] = None
    tax_rate: float = 0
    yearly_expenses: List[YearlyExpenses] = []
    
    @classmethod
    def from_user(cls, user: Any) -> "CachedUser":
        """Create cached version from full user."""
        return cls.model_validate(
            user.dict(
                exclude={
                    'password',
                    'friend_requests_sent',
                    'friend_requests_received'
                }
            )
        )