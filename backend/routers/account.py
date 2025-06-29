from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ibkr_service import IBKRService
from models import AllocationDTO, ChartDataPoint, ComboDTO, LedgerDTO
from typing import List
from deps import get_ibkr_service 

log = logging.getLogger(__name__)
router = APIRouter(prefix="/account", tags=["Market"])


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
    period: str = "1Y",
    ibkr: IBKRService = Depends(get_ibkr_service),
):
    if period not in _VALID_PERIODS:
        raise HTTPException(
            400,
            f"Invalid period '{period}'. Choose one of: {', '.join(sorted(_VALID_PERIODS))}",
        )

    raw = await ibkr.account_performance(period=period)         # ↩︎ POST /pa/performance

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
    

@router.get("/account/allocation", response_model=AllocationDTO)
async def get_allocation(svc: IBKRService = Depends(get_ibkr_service)):
    return await svc.account_allocation()

@router.get("/account/ledger", response_model=LedgerDTO)
async def get_ledger(svc: IBKRService = Depends(get_ibkr_service)):
    return await svc.ledger()

@router.get("/account/combos", response_model=list[ComboDTO])
async def get_combo_positions(svc: IBKRService = Depends(get_ibkr_service)):
    return await svc.combo_positions()

@router.get("/account/overview")
async def overview(svc: IBKRService = Depends(get_ibkr_service)):
    return {
        "summary": svc.state.account_summary,
        "ledger": svc.state.ledger,
        "allocation": svc.state.allocation,
        "positions": svc.state.positions,
        "combos": svc.state.combo_positions,
    }
