# models.py
import logging
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Literal, Optional
log = logging.getLogger("models")   # dedicate a channel for WS payloads


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
    daily_change_percent: Optional[float] = None
    daily_change_amount: Optional[float] = None

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

        return cls(
            conid             = row["conid"],
            symbol            = row["fullName"],
            last_price        = row["mktPrice"],
            quantity          = row["position"],
            avg_bought_price  = row["avgPrice"],
            value             = row["mktValue"],
            unrealized_pnl    = row["unrealizedPnl"],
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
class LedgerEntry(BaseModel):
    currency: str = Field(alias="secondKey")
    cashBalance: float = Field(alias="cashbalance") # Maps incoming 'cashbalance' to 'cashBalance'
    settledCash: float
    unrealizedPnl: float
    dividends: float
    exchangeRate: float

class LedgerDTO(BaseModel):
    baseCurrency: str
    ledgers: List[LedgerEntry]

class LedgerUpdate(BaseModel):
    type: str = "ledger"
    data: LedgerDTO


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
    

class OwnerInfoDTO(BaseModel):
    userName: str
    entityName: str
    roleId: str

class AccountInfoDTO(BaseModel):
    accountId: str
    accountTitle: str
    accountType: str
    tradingType: str
    baseCurrency: str
    ibEntity: str
    clearingStatus: str
    isPaper: bool

class PermissionsDTO(BaseModel):
    allowFXConv: bool
    allowCrypto: bool
    allowEventTrading: bool
    supportsFractions: bool

class AccountDetailsDTO(BaseModel):
    owner: OwnerInfoDTO
    account: AccountInfoDTO
    permissions: PermissionsDTO
    
class BriefAccountInfoDTO(BaseModel):
    accountId: str
    accountTitle: str
    displayName: str
    
class TweetInfo(BaseModel):
    url: str
    text: str
    score: float
    likes: int
    retweets: int

class SentimentResponse(BaseModel):
    sentiment: str
    score: float
    score_label: str
    tweets_analyzed: int
    top_positive_tweet: TweetInfo | None
    top_negative_tweet: TweetInfo | None

class WebSocketRequest(BaseModel):
    action: str  # e.g., "subscribe_stock", "unsubscribe_stock", "subscribe_portfolio"
    conid: Optional[int] = None
    account_id: Optional[str] = None
    
    
class Order(BaseModel):
    conid: int
    orderType: str
    side: Literal["BUY", "SELL"]
    quantity: float
    tif: str = "DAY"
    price: Optional[float] = None
    
class SearchResult(BaseModel):
    conid: int
    symbol: Optional[str] = None
    companyName: Optional[str] = None
    secType: Optional[str] = None
    
class OptionsChainResponse(BaseModel):
    expirations: Dict[str, List[float]] # e.g., {"AUG25": [150.0, 155.0, ...]}

class OptionContract(BaseModel):
    contractId: int
    strike: float
    type: Literal["call", "put"]
    lastPrice: Optional[float] = None
    bid: Optional[float] = None
    ask: Optional[float] = None
    volume: Optional[float] = None
    delta: Optional[float] = None
    bidSize: Optional[float] = None
    askSize: Optional[float] = None

class FullChainResponse(BaseModel):
    # e.g., { "60.0": { "call": OptionContract, "put": OptionContract } }
    chain: Dict[str, Dict[str, Optional[OptionContract]]]
    
class ConidResponse(BaseModel):
    conid: int
    companyName: str
    
class FilteredChainResponse(BaseModel):
    all_strikes: List[float]
    chain: Dict[str, Any] # The chain data is now a partial map
    
# A new response model for a single call/put pair
class SingleContractResponse(BaseModel):
    strike: float
    data: Dict[str, Optional[OptionContract]]