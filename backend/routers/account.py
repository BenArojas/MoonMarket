from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException
from ibkr_service import IBKRService
from models import AllocationDTO, ChartDataBars, ChartDataPoint, ComboDTO, LedgerDTO
from typing import List
from deps import get_ibkr_service 

log = logging.getLogger(__name__)
router = APIRouter(prefix="/account", tags=["Market"])

@router.get(
    "/performance-history",
    response_model=List[ChartDataPoint],
    summary="Get Account Performance History",
    tags=["Account Data"]
)
async def get_performance_history(
    ibkr_service: IBKRService = Depends(get_ibkr_service),
    period: str = "1Y",  # Default to 1 Year, frontend can override
):
    """
    Retrieves historical Net Asset Value (NAV) for the logged-in account,
    formatted for time-series charts.
    
    Available periods: "1D", "7D", "MTD", "1M", "YTD", "1Y".
    """
    valid_periods = ["1D", "7D", "MTD", "1M", "YTD", "1Y"]
    if period not in valid_periods:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid period '{period}'. Valid periods are: {', '.join(valid_periods)}"
        )

    try:
        data = await ibkr_service.account_performance(period=period)
        # Navigate the IBKR response structure to get NAVs and dates
        # Expected path based on documentation: response['nav']['data'][0] for NAVs, response['nav']['dates'] for dates
        nav_section = data.get("nav", {})
        account_nav_details_list = nav_section.get("data", [])
        
        if not account_nav_details_list:
            # logger.warning(f"No 'data' array found in 'nav' section for /pa/performance. Account: {self.app_state.ibkr_account_id}, Period: {period}")
            return []
        
        # Assuming the first entry in 'data' corresponds to our requested accountId
        account_nav_data = account_nav_details_list[0]
        
        nav_values = account_nav_data.get("navs", [])
        date_strings = nav_section.get("dates", []) # Dates are directly under 'nav'

        if not nav_values or not date_strings:
            # logger.warning(f"Missing 'navs' or 'dates' in /pa/performance response. NAVs: {len(nav_values)}, Dates: {len(date_strings)}")
            return []

        if len(nav_values) != len(date_strings):
            # logger.error(f"Data mismatch: {len(nav_values)} NAV values but {len(date_strings)} dates.")
            return []

        chart_data_points = []
        for i in range(len(date_strings)):
            date_str = date_strings[i]  # Format: "YYYYMMDD"
            nav_val = nav_values[i]
            
            try:
                # Convert "YYYYMMDD" to a datetime object
                dt_obj_naive = datetime.strptime(date_str, "%Y%m%d")
                # Assume the date represents the start of the day in UTC for consistency.
                # Lightweight Charts expects UNIX timestamps in seconds.
                dt_obj_utc = dt_obj_naive.replace(tzinfo=timezone.utc)
                timestamp_seconds = int(dt_obj_utc.timestamp())
                
                chart_data_points.append({"time": timestamp_seconds, "value": float(nav_val)})
            except ValueError as e:
                # logger.error(f"Error parsing date '{date_str}' or NAV '{nav_val}': {e}")
                continue 
            except TypeError as e: # Handles cases where nav_val might not be directly float-convertible (e.g. None)
                # logger.error(f"Error converting NAV '{nav_val}' to float for date '{date_str}': {e}")
                continue


        # logger.info(f"Successfully fetched and transformed {len(chart_data_points)} NAV data points for account {self.app_state.ibkr_account_id}, period {period}.")
        return chart_data_points

    except Exception as e:
        # Log the exception 'e' if not already logged deep within the service call
        log.info(e)
        raise HTTPException(status_code=500, detail="An internal error occurred while fetching account performance history.")
    

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
