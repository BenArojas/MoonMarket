# routes/account_transactions.py
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, RootModel, computed_field

from deps import get_ibkr_service
from ibkr_service import IBKRService

log = logging.getLogger(__name__)
router = APIRouter(prefix="/transactions", tags=["Account transactions Data"])


# --------------------------------------------------------------------------- #
#  ✨  1. A light DTO that matches what the React side already expects
# --------------------------------------------------------------------------- #
TradeSide = Literal["purchase", "sale"]


class TransactionDTO(BaseModel):
    """
    Normalised single-trade object returned to the frontend.

    Only the fields the React layer actually uses are included, but you can add
    more if you later need them (e.g. commission, fxRate…).
    """
    conid: int
    ticker: str
    price: float
    quantity: int
    type: TradeSide                       # “purchase” or “sale”
    transaction_date: datetime
    text: str = ""                        # verbose description from IBKR

    # convenience: generate the win/lose wording once
    @computed_field
    @property
    def title(self) -> str:                # keeps your <TransactionsTable> happy
        side = "Bought" if self.type == "purchase" else "Sold"
        return f"{side} {abs(self.quantity)}× {self.ticker} @ {self.price}"

    # ---- helper to build from raw CP response --------------------------------
    @classmethod
    def from_ibkr(cls, raw: dict) -> "TransactionDTO":
        """
        Convert a single entry from Client-Portal `/pa/transactions`.
        """
        # qty comes back as signed int: + = buy, – = sell
        qty = int(raw["qty"])
        side: TradeSide = "purchase" if qty > 0 else "sale"

        # date is e.g. “Mon Mar 18 00:00:00 EST 2024”
        # → parse, throw away time-of-day & TZ, keep UTC midnight
        dt = datetime.strptime(raw["date"][:11] + raw["date"][-4:], "%a %b %d %Y")
        dt = dt.replace(tzinfo=timezone.utc)           # lightweight-charts wants seconds UTC

        return cls(
            conid=raw["conid"],
            ticker=raw.get("symbol") or raw.get("desc", "").split(" ")[0],
            price=float(raw["pr"]),
            quantity=abs(qty),
            type=side,
            transaction_date=dt,
            text=raw.get("desc", ""),
        )
        
@router.get(
    "/",
    response_model=List[TransactionDTO],
    summary="Get realised trades for the account",
)
async def get_transactions(
    days: int = Query(90, ge=1, le=365, description="History window in days"),
    ibkr_service: IBKRService = Depends(get_ibkr_service),
):
    """
    Aggregates **realised** buy/sell trades for every instrument in the account.

    Internally we:

    1.  Pull the current positions ⇒ unique **conids**.
    2.  POST `/pa/transactions` once per conid (IBKR only accepts one at a time).
    3.  Flatten & transform to :class:`TransactionDTO`.
    """
    try:
        acct_id = await ibkr_service._primary_account()
        if not acct_id:
            raise HTTPException(status_code=404, detail="No account found")

        # 1⃣ positions → conids
        pos = await ibkr_service.positions(acct_id)
        conids = {p["conid"] for p in pos}
        if not conids:
            return []

        # 2⃣ loop over the contracts — CP insists on *one* conid per request
        trades: list[TransactionDTO] = []
        for conid in conids:
            payload = {
                "acctIds": [acct_id],
                "conids": [conid],
                "currency": "USD",
                "days": days,
            }
            raw = await ibkr_service._req("POST", "/pa/transactions", json=payload)

            # CP nests the actual rows under ['transactions']; fall back to ['data'] just in case
            rows = raw.get("transactions") or raw.get("data") or []
            trades.extend(TransactionDTO.from_ibkr(r) for r in rows)

        # 3⃣ newest first for table UX
        trades.sort(key=lambda t: t.transaction_date, reverse=True)
        log.info("Fetched %d realised trades (%d-day window)", len(trades), days)
        return trades

    except HTTPException:
        raise  # re-throw untouched

    except Exception as exc:
        log.exception("Failed to fetch trades: %s", exc)
        raise HTTPException(status_code=500, detail="Could not retrieve transactions")