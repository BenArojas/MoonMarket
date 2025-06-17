# models.py
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Literal, Optional


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

    # ── identifiers ───────────────────────────────────────────────
    conid: int                      
    symbol: str

    # ── dynamic prices ────────────────────────────────────────────
    last_price: float                

    # ── static / optional position data ───────────────────────────
    quantity: Optional[float] = None
    avg_bought_price: Optional[float] = None
    value: Optional[float] = None
    unrealized_pnl: Optional[float] = None

    # ----------------------------------------------------------------
    @classmethod
    def from_position_row(cls, row: dict) -> "FrontendMarketDataUpdate":
        """
        Build a *snapshot* object from the IBKR /portfolio/positions row.
        This fills all optional fields so the front end starts fully hydrated.
        """
        last = row["mktPrice"]
        qty  = row["position"]

        return cls(
            conid             = row["conid"],
            symbol            = row["contractDesc"],
            last_price        = last,
            quantity          = qty,
            avg_bought_price  = row["avgCost"],
            value             = last * qty,
            unrealized_pnl    = (last - row["avgCost"]) * qty,
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


# ---------- AllocationDTO ----------------------------------------------------
class _LongShort(BaseModel):
    long: Dict[str, float]  # {"STK": 12345.67, "OPT": 9876.00}
    short: Dict[str, float]  # ditto (may be empty)


class AllocationDTO(BaseModel):
    assetClass: _LongShort
    sector: _LongShort
    group: _LongShort


# ---------- LedgerDTO --------------------------------------------------------
class LedgerCurrencyDTO(BaseModel):
    currency: str                   # "USD", "EUR", "BASE"…
    cash_balance: float = Field(..., alias="cashbalance")
    unrealized_pnl: float = Field(..., alias="unrealizedpnl")
    realized_pnl: float = Field(..., alias="realizedpnl")
    net_liquidation_value: float = Field(..., alias="netliquidationvalue")
    timestamp: int


class LedgerDTO(BaseModel):
    currencies: List[LedgerCurrencyDTO]


# ---------- ComboDTO ---------------------------------------------------------
class ComboLegDTO(BaseModel):
    conid: int
    ratio: int


class ComboPositionLegDTO(BaseModel):
    acctId: str
    conid: int
    contractDesc: str
    position: float
    mktPrice: float
    mktValue: float
    currency: str
    avgCost: float
    avgPrice: float
    realizedPnl: float
    unrealizedPnl: float
    assetClass: str


class ComboDTO(BaseModel):
    name: str
    description: str
    legs: List[ComboLegDTO]
    positions: List[ComboPositionLegDTO]
    
class PnlRow(BaseModel):
    rowType: int
    dpl: float   # daily realised
    nl:  float   # net liquidity
    upl: float   # unrealised
    uel: float   # excess liquidity (un-rounded)
    mv:  float   # margin value

class PnlUpdate(BaseModel):
    type: Literal["pnl"]
    data: Dict[str, PnlRow]   # keyed by "U1234567.Core"