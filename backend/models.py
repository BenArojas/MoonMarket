# models.py
from pydantic import BaseModel
from typing import Dict, Any, Optional


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
    def from_position_row(cls, row: dict) -> "FrontendMarketDataUpdate":
        return cls(
            symbol=row["contractDesc"],
            last_price=row["mktPrice"],
            avg_bought_price=row["avgCost"],
            quantity=row["position"],
            value=row["mktValue"],
            unrealized_pnl=row["unrealizedPnl"],
        )

class FrontendAccountSummaryUpdate(FrontendMessageBase):
    type: str = "account_summary"
    data: Dict[str, Any] # Matches your frontend's expectation

class WatchlistMessage(FrontendMessageBase):
    type: str = "watchlists"
    data: Dict[str, Any] 

class AuthStatus(BaseModel):
    authenticated: bool
    session_active: Optional[bool] = None
    session_id_short: Optional[str] = None
    user_id: Optional[str] = None
    iserver_status: Optional[Dict[str, Any]] = None
    websocket_ready: Optional[bool] = None # True if IBKR WS connection is active
    message: Optional[str] = None
    error: Optional[str] = None

class ChartDataPoint(BaseModel):
    time: int  # UNIX timestamp in seconds
    value: float

    
class ChartDataBars(BaseModel):
    time: int  # UNIX timestamp in seconds
    open: float
    volume: float
    high: float
    low: float
    close: float
