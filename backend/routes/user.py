"""User router."""

import asyncio
import json
import logging
from typing import Optional
from cache.manager import CacheManager
from helpers import call_perplexity, fetch_sentiment, get_stock_price
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from models.user import (
    User,
    UserOut,
    PasswordChangeRequest,
    Deposit,
    UserFriend,
    YearlyExpenses,
)
from fastapi.responses import JSONResponse
from utils.auth_user import get_current_user
from models.transaction import Transaction
from models.stock import Stock
from models.PortfolioSnapshot import PortfolioSnapshot
from utils.password import hash_password, verify_password
from aiohttp import ClientSession
from datetime import datetime, timezone

router = APIRouter(tags=["User"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=UserOut, operation_id="retrieve_user")
async def get_user(user: User = Depends(get_current_user)):  # type: ignore[no-untyped-def]
    """Return the current user."""
    return user


@router.get("/name", operation_id="retrieve_user_name")
async def get_user_name(user: User = Depends(get_current_user)):
    """Return the current user first name."""
    return user.username


@router.get("/holdings")
async def get_holdings(user: User = Depends(get_current_user)):
    # Retrieve holdings for the specified user ID
    return user.holdings


@router.get("/stocks")
async def get_stocks(user: User = Depends(get_current_user)):
    # Get unique tickers from user's holdings
    tickers = set(holding.ticker for holding in user.holdings)
    # Fetch only the stocks that the user holds
    stocks = await Stock.find({"ticker": {"$in": list(tickers)}}).to_list()
    return stocks


@router.get("/user_transactions", operation_id="retrieve_user_transactions")
async def get_user_transactions_by_user_id(user: User = Depends(get_current_user)):
    transactions = get_user_transactions(user.id)
    return transactions


@router.get(
    "/user_transactions/{type}",
    response_model=UserOut,
    operation_id="retrieve_user_transactions_by_type",
)
async def get_user_transactions_by_type(
    type: str, user: User = Depends(get_current_user)
):
    transactions = await Transaction.find(
        Transaction.user_id.id == user.id, Transaction.type == type
    ).to_list()
    return transactions


@router.get("/user_friend/{username}", response_model=UserFriend)
async def get_user_by_username(
    username: str, current_user: User = Depends(get_current_user)
):

    if username == current_user.username:
        raise HTTPException(
            status_code=400, detail="Cannot retrieve your own profile as a friend"
        )

    user = await User.find_one(User.username == username)

    if user:
        if user.id in current_user.friends:
            raise HTTPException(status_code=400, detail="User is already your friend")
        return UserFriend(email=user.email, username=user.username)
    raise HTTPException(status_code=404, detail="User not found")


@router.get("/users_list")
async def users_list(current_user: User = Depends(get_current_user)):
    users = [
        {
            "id": str(current_user.id),
            "username": current_user.username,
            "email": current_user.email,
        }
    ]
    for friend_id in current_user.friends:
        user = await User.get(friend_id)
        if not user:
            continue
        friend_detail = {
            "id": str(friend_id),
            "username": user.username,
            "email": user.email,
        }
        users.append(friend_detail)
    return users


@router.post("/add_deposit")
async def add_deposit(
    deposit: Deposit, request: Request, user: User = Depends(get_current_user)
):
    """Add deposit to user account."""
    user.deposits.append(deposit)
    user.current_balance += deposit.amount
    await user.save()

    cache_manager = CacheManager(request)
    await cache_manager.cache_user(user)
    return user


@router.patch("/update-username", operation_id="update_user_details")
async def update_user(
    new_username: str, request: Request, user: User = Depends(get_current_user)
) -> str:
    """Update username field."""
    username_check = await User.by_username(new_username)
    if username_check is not None:
        raise HTTPException(409, "User with that username already exists")
    user.username = new_username

    await user.save()
    cache_manager = CacheManager(request)
    await cache_manager.cache_user(user)
    return user.username


@router.patch("/change_password", operation_id="change_password")
async def update_password(
    request: PasswordChangeRequest,
    http_request: Request,
    user: User = Depends(get_current_user),
):
    """change user password."""
    if not verify_password(request.password, user.password):
        raise HTTPException(400, "Passwords do not match")
    # Hash the new password
    hashed_new_password = hash_password(request.new_password)
    # Update the user's password
    user.password = hashed_new_password

    await user.save()
    cache_manager = CacheManager(http_request)
    await cache_manager.invalidate_user(user)
    return JSONResponse(
        status_code=200, content={"message": "Password changed successfully"}
    )


def get_year_expenses(user: User, year: int) -> Optional[YearlyExpenses]:
    return next((exp for exp in user.yearly_expenses if exp.year == year), None)


@router.delete("/delete", operation_id="delete_user_account")
async def delete_user(
    request: Request, current_user: User = Depends(get_current_user)
) -> Response:
    """Delete current user."""
    # Find and delete transactions associated with the user
    await Transaction.find(Transaction.user_id.id == current_user.id).delete()
    await PortfolioSnapshot.find(
        PortfolioSnapshot.userId.id == current_user.id
    ).delete()

    # End user's session before deletion
    await current_user.end_session(request)

    # Delete the user
    await current_user.delete()

    # Create response that will also clear the session cookie
    response = Response(status_code=204)
    response.delete_cookie("session")

    return response


# Combined AI endpoint
@router.get("/ai/insights")
async def get_combined_ai(request: Request, user: User = Depends(get_current_user)):
    try:
        cache_manager = CacheManager(request)
        cache_key = f"ai_insights:user:{str(user.id)}"
        cached_data = await cache_manager.redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

        holdings = user.holdings
        total_value = 0
        stock_values = {}
        tickers = [holding.ticker for holding in holdings]

        # Parallel fetch stock prices
        async with ClientSession() as session:
            tasks = [get_stock_price(ticker, session) for ticker in tickers]
            stock_prices = await asyncio.gather(*tasks, return_exceptions=True)

        # Process stock prices
        for i, (ticker, price) in enumerate(zip(tickers, stock_prices)):
            if isinstance(price, Exception):
                print(f"Error fetching price for {ticker}: {str(price)}")
                price = (
                    (await Stock.find_one(Stock.ticker == ticker)).price
                    if await Stock.find_one(Stock.ticker == ticker)
                    else 0
                )
            holding = holdings[i]
            quantity = holding.quantity
            avg_price = holding.avg_bought_price
            value = quantity * price
            total_value += value
            stock_values[ticker] = {
                "value": value,
                "quantity": quantity,
                "avg_price": avg_price,
            }

        user_transactions = await get_user_transactions(user.id)
        logger.info(f"transactions are: {user_transactions}")

        transactions_summary = summarize_transactions(user_transactions, stock_values)
        logger.info(f"transactions_summary are: {transactions_summary}")

        # Prepare data for AI model
        portfolio_summary = {
            "total_value": total_value,
            "holdings": stock_values,
            "transactions": transactions_summary,
        }
        logger.info(f"portfolio_summary is: {portfolio_summary}")

        insights = await call_perplexity(portfolio_summary)

        # Return only portfolio insights (no sentiments here)
        response = {
            "portfolio_insights": insights["content"],  # Extract content for insights
            "citations": insights["citations"],  # Pass citations to frontend
            "sentiments": {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        await cache_manager.redis.setex(cache_key, 21600, json.dumps(response))
        return response
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating AI insights: {str(e)}"
        )


@router.get("/ai/sentiment/{ticker}")
async def get_ticker_sentiment(
    ticker: str, request: Request, user: User = Depends(get_current_user)
):
    try:
        cache_manager = CacheManager(request)
        cache_key = f"sentiment:{ticker.upper()}"
        cached_data = await cache_manager.redis.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

        # Fetch sentiment for the single ticker
        sentiment = await fetch_sentiment(ticker.upper(), cache_manager)

        # Cache for 6 hours
        await cache_manager.redis.setex(cache_key, 21600, json.dumps(sentiment))
        return sentiment
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error fetching sentiment for {ticker}: {str(e)}"
        )


async def get_user_transactions(id):
    # Retrieve transactions for the specified user ID
    transactions = await Transaction.find(Transaction.user_id.id == id).to_list()
    return transactions


def summarize_transactions(user_transactions, stock_values):
    transactions_summary = {}
    for tx in user_transactions:
        ticker = tx.ticker
        if ticker not in transactions_summary:
            transactions_summary[ticker] = {
                "buys": 0,
                "sells": 0,
                "total_buy_value": 0,
                "total_sell_value": 0,
            }
        if tx.type == "purchase":
            transactions_summary[ticker]["buys"] += tx.quantity
            transactions_summary[ticker]["total_buy_value"] += tx.quantity * tx.price
        elif tx.type == "sale":
            transactions_summary[ticker]["sells"] += tx.quantity
            transactions_summary[ticker]["total_sell_value"] += tx.quantity * tx.price

    # Calculate averages and filter to current holdings
    for ticker in stock_values.keys():
        if ticker in transactions_summary:
            ts = transactions_summary[ticker]
            ts["avg_buy_price"] = (
                ts["total_buy_value"] / ts["buys"] if ts["buys"] > 0 else 0
            )
            ts["avg_sell_price"] = (
                ts["total_sell_value"] / ts["sells"] if ts["sells"] > 0 else 0
            )
            del ts["total_buy_value"]
            del ts["total_sell_value"]
        else:
            transactions_summary[ticker] = {
                "buys": stock_values[ticker]["quantity"],
                "avg_buy_price": stock_values[ticker]["avg_price"],
                "sells": 0,
            }
    return transactions_summary
