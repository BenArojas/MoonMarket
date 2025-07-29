import asyncio
from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ibkr_service import IBKRService
from models import AccountDetailsDTO, AccountPermissions, AllocationDTO, BriefAccountInfoDTO, ChartDataPoint, ComboDTO, LedgerDTO, PnlRow, PnlUpdate
from typing import List
from deps import get_ibkr_service 

log = logging.getLogger(__name__)
router = APIRouter(prefix="/account", tags=["Account"])


class _Series(BaseModel):
    dates: List[str]
    values: List[float]


class NAVSeries(_Series):
    """Dollar account values – one point per day"""
    values: List[float] = Field(alias="navs")


class ReturnSeries(_Series):
    """Return percentages in decimal form (0.063 ⇒ 6.3 %)"""
    values: List[float] = Field(alias="returns")


class PerformanceResponse(BaseModel):
    nav: NAVSeries
    cps: ReturnSeries           # cumulative %
    tpps: ReturnSeries          # period %
    
_VALID_PERIODS = {"1D", "7D", "MTD", "1M", "YTD", "1Y"}

@router.get("/performance", response_model=PerformanceResponse)
async def account_performance(
    accountId: str,
    period: str = "1Y",
    ibkr: IBKRService = Depends(get_ibkr_service),
):
    if period not in _VALID_PERIODS:
        raise HTTPException(
            400,
            f"Invalid period '{period}'. Choose one of: {', '.join(sorted(_VALID_PERIODS))}",
        )

    raw = await ibkr.account_performance(accountId,period=period)         # ↩︎ POST /pa/performance

    try:
        # Each section already contains its own dates; just normalise keys
        return PerformanceResponse(
            nav = {
                "dates": raw["nav"]["dates"],
                "navs" : raw["nav"]["data"][0]["navs"],       # <-- alias
            },
            cps = {
                "dates"   : raw["cps"]["dates"],
                "returns" : raw["cps"]["data"][0]["returns"], # <-- alias
            },
            tpps = {
                "dates"   : raw["tpps"]["dates"],
                "returns" : raw["tpps"]["data"][0]["returns"],
            },
        )

    except (KeyError, IndexError) as exc:
        raise HTTPException(502, f"Unexpected IBKR payload: {exc}")
    

@router.get("/allocation", response_model=AllocationDTO)
async def get_allocation(accountId: str,svc: IBKRService = Depends(get_ibkr_service)):
    return await svc.account_allocation(accountId)

@router.get("/ledger", response_model=LedgerDTO)
async def get_ledger(accountId: str, svc: IBKRService = Depends(get_ibkr_service)):
    return await svc.ledger(accountId)

@router.get("/{account_id}/permissions", response_model=AccountPermissions)
async def get_permissions(
    account_id: str,
    svc: IBKRService = Depends(get_ibkr_service)
):
    """Returns a simplified object of key trading permissions for the account."""
    return await svc.get_account_permissions(account_id)

@router.get("/account-details/", response_model=AccountDetailsDTO)
async def get_account_details(accountId: str, svc: IBKRService = Depends(get_ibkr_service)):
    """
    Provides a consolidated view of account details, including owner info,
    account metadata, and trading permissions.
    """
    return await svc.get_account_details(accountId)

@router.get("/accounts", response_model=List[BriefAccountInfoDTO])
async def get_available_accounts(svc: IBKRService = Depends(get_ibkr_service)):
    """
    Fetches a list of all accounts available to the user.
    This is used for the initial account selection screen.
    """
    return await svc.get_available_accounts()

@router.get("/accounts/{account_id}/summary", summary="Get account summary")
async def get_account_summary_route(
    account_id: str,
    ibkr_service: IBKRService = Depends(get_ibkr_service)
):
    return await ibkr_service.get_account_summary(account_id)


class PnlSnapshotDTO(BaseModel):
    dailyRealized: float
    unrealized: float 
    netLiq: float 
    marketValue: float  # Corresponds to 'mv' from IBKR
    equityWithLoanValue: float # Corresponds to 'el' from IBKR
    
@router.get("/pnl", response_model=PnlSnapshotDTO)
async def get_pnl_snapshot(
    accountId: str,
    svc: IBKRService = Depends(get_ibkr_service),
):
    """
    Fetches a simple snapshot of the account's core PnL values
    from the dedicated PnL endpoint.
    """
    try:
        # 1. Make a single call to the correct endpoint
        pnl_response = await svc.get_pnl()
        log.info(pnl_response)

        # 2. Navigate the correct JSON structure: upnl -> {accountId}.Core
        upnl_data = pnl_response.get("upnl", {})
        
        # 3. Find the data for the specific account we want
        core_key = f"{accountId}.Core"
        core_data = upnl_data.get(core_key)

        if not core_data:
            raise HTTPException(status_code=404, detail=f"PnL data not found for account {accountId}")

        # 4. Extract the values we need from the .Core object
        dpl = core_data.get("dpl", 0.0)
        upl = core_data.get("upl", 0.0)
        nl = core_data.get("nl", 0.0)
        mv = core_data.get("mv", 0.0) # Market Value
        el = core_data.get("el", 0.0) # Equity with Loan Value
        
        # 5. Return the data in our simple DTO format
        return PnlSnapshotDTO(
            dailyRealized=dpl,
            unrealized=upl,
            netLiq=nl,
            marketValue=mv,       
            equityWithLoanValue=el 
        )

    except Exception as e:
        log.error(f"Failed to create PnL snapshot for {accountId}: {e}")
        raise HTTPException(status_code=502, detail="Could not fetch PnL data.")