# routes/account_transactions.py
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, RootModel, computed_field

from deps import get_ibkr_service
from ibkr_service import IBKRService

log = logging.getLogger(__name__)
router = APIRouter(prefix="/transactions", tags=["Account transactions Data"])


        
@router.get(
    "/",
    summary="Get realised transactions and P/L for the account",
    # Define the response model for better OpenAPI docs, matching the frontend's expectation
    response_model=Dict[str, List[Dict[str, Any]]] 
)
async def get_transactions(
    days: int = Query(90, ge=1, le=365, description="History window in days"),
    ibkr_service: IBKRService = Depends(get_ibkr_service), # Use your real service here
):
    """
    Aggregates **realised** buy/sell trades and P/L for every instrument in the account.

    Internally we:
    1.  Pull the current positions ⇒ unique **conids**.
    2.  POST `/pa/transactions` once per conid (IBKR only accepts one at a time).
    3.  Aggregate the `transactions` and P/L (`pnl`) data from all calls.
    4.  Return a dictionary containing both lists, as expected by the frontend.
    """
    try:
        acct_id = await ibkr_service._primary_account()
        if not acct_id:
            raise HTTPException(status_code=404, detail="No account found")

        # 1️⃣ Get all unique conids from current positions
        pos = ibkr_service.state.positions or await ibkr_service.positions(acct_id)
        
        conids_set = {p["conid"] for p in pos if p.get("conid") and isinstance(p["conid"], int)}
        
        if not conids_set:
            return {"transactions": [], "pnl": []}

        # --- FIX: Convert set to a list to allow indexing ---
        conids_list = list(conids_set)
        all_transactions = []
        all_pnl = []

        # 2️⃣ Fetch transactions for each conid concurrently
        async def fetch_for_conid(conid: int):
            payload = {
                "acctIds": [acct_id],
                "conids": [conid],
                "currency": "USD",
                "days": days,
            }
            # The raw response contains 'transactions' and 'rpnl' keys
            return await ibkr_service._req("POST", "/pa/transactions", json=payload)

        # Use asyncio.gather to run all API calls in parallel for efficiency
        results = await asyncio.gather(*(fetch_for_conid(c) for c in conids_list), return_exceptions=True)
        
        # Filter out exceptions and log failed conids
        successful_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                failed_conid = conids_list[i]
                log.error(f"Failed to fetch data for conid {failed_conid}: {result}")
            else:
                successful_results.append(result)

        # 3️⃣ Aggregate the results from all calls
        for res in successful_results:
            if res and res.get("transactions"):
                all_transactions.extend(res["transactions"])
            if res and res.get("rpnl", {}).get("data"):
                all_pnl.extend(res["rpnl"]["data"])
        
        # 4️⃣ Return the aggregated data in the format the frontend expects
        return {"transactions": all_transactions, "pnl": all_pnl}

    except HTTPException:
        raise  # Re-throw exceptions you've already handled

    except Exception as exc:
        log.exception("Failed to fetch transaction history: %s", exc)
        raise HTTPException(status_code=500, detail="Could not retrieve transaction history")
    


@router.get(
    "/trades",
    summary="Get recent trades for the account",
    response_model=List[Dict[str, Any]] # Define the response model for docs
)
async def get_trades(
    days: int = Query(7, ge=1, le=7, description="History window in days"),
    ibkr_service: IBKRService = Depends(get_ibkr_service),
):
    """
    Returns a list of trades for the currently selected account for the
    current day and up to six previous days. It is advised by IBKR to
    call this endpoint once per session.
    """
    try:
        # This endpoint is simpler and fetches all recent trades in one go.
        # It does not require looping through conids.
        trades_data = await ibkr_service._req(
            "GET",
            "/iserver/account/trades",
            params={"days": days}
        )
        return trades_data

    except Exception as exc:
        log.exception("Failed to fetch recent trades: %s", exc)
        raise HTTPException(status_code=500, detail="Could not retrieve recent trades")
    

@router.get("/live-orders", summary="Get live orders")
async def get_live_orders_route(ibkr_service: IBKRService = Depends(get_ibkr_service)):
    return await ibkr_service.get_live_orders()

@router.delete("/orders/{order_id}", summary="Cancel an order")
async def cancel_order_route(order_id: str, accountId: str, ibkr_service: IBKRService = Depends(get_ibkr_service)):
    # Assuming you have a way to get the current account ID
    return await ibkr_service.cancel_order(accountId, order_id)

@router.post("/orders/{order_id}", summary="Modify an order")
async def modify_order_route(order_id: str, accountId: str, new_order_data: Dict[str, Any], ibkr_service: IBKRService = Depends(get_ibkr_service)):
    return await ibkr_service.modify_order(accountId, order_id, new_order_data)