"""Shared schemas for models."""
from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import Request
from pydantic import BaseModel, EmailStr,  model_validator, validator
from beanie import PydanticObjectId
from user import ApiProvider


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

    @model_validator(mode='before')
    @classmethod
    def validate_nested(cls, values):
        if isinstance(values, dict):
            # Convert deposits list
            if 'deposits' in values:
                values['deposits'] = [
                    Deposit.model_validate(d) if isinstance(d, dict) else d 
                    for d in values['deposits']
                ]
            
            # Convert yearly_expenses list
            if 'yearly_expenses' in values:
                values['yearly_expenses'] = [
                    YearlyExpenses.model_validate(e) if isinstance(e, dict) else e 
                    for e in values['yearly_expenses']
                ]
        return values
    

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