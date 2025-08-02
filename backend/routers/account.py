import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ibkr import IBKRService
from models import AccountDetailsDTO, AccountPermissions, AllocationDTO, BriefAccountInfoDTO, LedgerDTO
from typing import Any, Dict, List, Optional
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

@router.get("/account-details", response_model=AccountDetailsDTO)
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
    max_retries: int = 3,
    retry_delay_seconds: int = 2
):
    """
    Fetches a simple snapshot of the account's core PnL values
    from the dedicated PnL endpoint, with retry mechanism for incomplete data.
    After max_retries, returns the latest available data.
    """
    latest_valid_pnl_dto: Optional[PnlSnapshotDTO] = None
    
    for attempt in range(max_retries):
        try:
            log.info(f"Attempt {attempt + 1}/{max_retries} to fetch PnL for account {accountId}")
            pnl_response: Dict[str, Any] = await svc.get_pnl()

            upnl_data = pnl_response.get("upnl", {})
            core_key = f"{accountId}.Core"
            core_data = upnl_data.get(core_key)

            if not core_data:
                log.warning(f"Attempt {attempt + 1}: PnL core data not found for account {accountId}.")
                if attempt < max_retries - 1:
                    log.info(f"Retrying in {retry_delay_seconds} seconds...")
                    await asyncio.sleep(retry_delay_seconds)
                    continue
                else:
                    # If core_data is missing after all retries, raise an error
                    raise HTTPException(status_code=404, detail=f"PnL data not found for account {accountId} after {max_retries} attempts.")

            # Extract values, defaulting to 0.0 if missing
            dpl = core_data.get("dpl", 0.0)
            upl = core_data.get("upl", 0.0)
            nl = core_data.get("nl", 0.0)
            mv = core_data.get("mv", 0.0) # Market Value
            el = core_data.get("el", 0.0) # Equity with Loan Value

            # Check if any of the critical fields are 0.0
            is_data_incomplete = False
            missing_fields = []

            if dpl == 0.0: missing_fields.append("dailyRealized (dpl)")
            if upl == 0.0: missing_fields.append("unrealized (upl)")
            if nl == 0.0: missing_fields.append("netLiq (nl)")
            if mv == 0.0: missing_fields.append("marketValue (mv)")
            if el == 0.0: missing_fields.append("equityWithLoanValue (el)")

            if missing_fields:
                is_data_incomplete = True
                log.warning(f"Attempt {attempt + 1}: Incomplete PnL data for account {accountId}. Fields with 0.0: {', '.join(missing_fields)}")

            current_pnl_dto = PnlSnapshotDTO(
                dailyRealized=dpl,
                unrealized=upl,
                netLiq=nl,
                marketValue=mv,
                equityWithLoanValue=el
            )
            
            # If the current data is complete, return it immediately
            if not is_data_incomplete:
                log.info(f"Attempt {attempt + 1}: All PnL fields valid for account {accountId}. Returning current data.")
                return current_pnl_dto
            else:
                # Store the latest, even if incomplete, for eventual return
                latest_valid_pnl_dto = current_pnl_dto 
                
                if attempt < max_retries - 1:
                    log.info(f"Retrying in {retry_delay_seconds} seconds...")
                    await asyncio.sleep(retry_delay_seconds)
                    continue # Continue to the next attempt
                else:
                    log.warning(f"Max retries ({max_retries}) reached. Returning the latest available PnL data for account {accountId}, which may be incomplete.")
                    return latest_valid_pnl_dto # Return the latest data after all retries

        except HTTPException as he:
            # Re-raise explicit HTTPExceptions (e.g., 404 for missing core data after retries)
            raise he
        except Exception as e:
            log.error(f"Attempt {attempt + 1}: Unexpected error fetching PnL snapshot for {accountId}: {e}")
            if attempt < max_retries - 1:
                log.info(f"Retrying in {retry_delay_seconds} seconds due to error...")
                await asyncio.sleep(retry_delay_seconds)
                continue
            else:
                # If an unexpected error persists after retries, raise a generic 502
                raise HTTPException(status_code=502, detail=f"Could not fetch PnL data after {max_retries} attempts due to an unexpected error.")

    # This part should ideally not be reached if latest_valid_pnl_dto is always set
    # or an HTTPException is raised. But as a fallback:
    if latest_valid_pnl_dto:
        return latest_valid_pnl_dto
    else:
        raise HTTPException(status_code=500, detail="An unrecoverable error occurred and no PnL data could be retrieved.")