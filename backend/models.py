# models.py
import logging
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List

class PositionData(BaseModel):
    symbol: str
    conid: int
    last_price: float = 0.0
    avg_bought_price: float = 0.0
    quantity: float = 0.0 # Use float for quantity if fractional shares are possible
    mkt_value: float = 0.0
    unrealized_pnl: float = 0.0

    def update_market_data(self, new_price: float):
        self.last_price = new_price
        self.mkt_value = self.last_price * self.quantity
        if self.avg_bought_price != 0: # Avoid issues if avg_cost is zero
            self.unrealized_pnl = (self.last_price - self.avg_bought_price) * self.quantity
        elif self.quantity > 0 : # PNL is market value if no cost basis
             self.unrealized_pnl = self.mkt_value
        else:
            self.unrealized_pnl = 0.0


class AccountSummaryData(BaseModel):
    # Define specific fields you expect from IBKR summary, e.g.,
    net_liquidation: Optional[float] = None
    total_cash_value: Optional[float] = None
    buying_power: Optional[float] = None
    # Allow dynamic fields from IBKR
    additional_details: Dict[str, Any] = {}

# --- Frontend Specific Models ---
class FrontendMessageBase(BaseModel):
    type: str

class FrontendMarketDataUpdate(FrontendMessageBase):
    type: str = "market_data"
    symbol: str
    last_price: float
    avg_bought_price: float
    quantity: float
    value: float # Renamed from mkt_value for frontend consistency
    unrealized_pnl: float

    @classmethod
    def from_position_data(cls, pos: PositionData) -> "FrontendMarketDataUpdate":
        return cls(
            symbol=pos.symbol,
            last_price=pos.last_price,
            avg_bought_price=pos.avg_bought_price,
            quantity=pos.quantity,
            value=pos.mkt_value,
            unrealized_pnl=pos.unrealized_pnl,
        )

class FrontendAccountSummaryUpdate(FrontendMessageBase):
    type: str = "account_summary"
    data: Dict[str, Any] # Matches your frontend's expectation

class AuthStatus(BaseModel):
    authenticated: bool
    session_active: Optional[bool] = None
    session_id_short: Optional[str] = None
    user_id: Optional[str] = None
    iserver_status: Optional[Dict[str, Any]] = None
    websocket_ready: Optional[bool] = None # True if IBKR WS connection is active
    message: Optional[str] = None
    error: Optional[str] = None