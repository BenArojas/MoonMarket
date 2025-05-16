"""User router."""

import asyncio
import json
import logging
from typing import Optional

from beanie import PydanticObjectId
from models.APIKeyManager import ApiKey
from models.user import AccountSetupRequest
from routes.apiKey import validate_fmp_key
from models.subscription import BillingCycle, Subscription, ToggleTier
from cache.manager import CacheManager
from helpers import call_perplexity, fetch_sentiment, get_stock_price
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from models.user import (
    AccountType,
    ApiProvider,
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
from datetime import datetime, timedelta, timezone

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
    transactions = await get_user_transactions(user.id)
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


@router.post("/toggle-tier/{user_id}")
async def toggle_tier(
    request: ToggleTier,
    http_request: Request,
    user: User = Depends(get_current_user),
):
    # Validate account_type
    try:
        account_type_enum = AccountType(request.account_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account type")

    # Handle FREE tier
    if account_type_enum == AccountType.FREE:
        # Deactivate any existing subscription
        existing_sub = await Subscription.find_one(
            Subscription.user_id == PydanticObjectId(user.id),  
            Subscription.active == True, fetch_links=True
        )
        if existing_sub:
            existing_sub.active = False
            await existing_sub.save()

        # Update user to FREE
        user.account_type = AccountType.FREE
        await user.save()
        return {"message": "Switched to free tier"}

    # Handle PREMIUM tier (requires billing_cycle)
    if request.billing_cycle is None:
        raise HTTPException(
            status_code=400, detail="Billing cycle required for premium tier"
        )

    try:
        billing_cycle_enum = BillingCycle(request.billing_cycle)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid billing cycle")

    # Check for existing active subscription
    existing_sub = await Subscription.find_one(
        Subscription.user_id == PydanticObjectId(user.id), 
        Subscription.active == True, fetch_links=True
    )
    if existing_sub:
        existing_sub.active = False  
        await existing_sub.save()

    # Simulate payment and create new subscription for PREMIUM
    duration = (
        timedelta(days=30)
        if billing_cycle_enum == BillingCycle.MONTHLY
        else timedelta(days=365)
    )
    new_subscription = Subscription(
        user_id=user.id, 
        account_type=AccountType.PREMIUM,
        billing_cycle=billing_cycle_enum,
        start_date=datetime.now(),
        end_date=datetime.now() + duration,
        active=True,
    )
    await new_subscription.insert()

    user.account_type = AccountType.PREMIUM
    await user.save()
    cache_manager = CacheManager(http_request)
    await cache_manager.cache_user(user)

    return {"message": f"Upgraded to premium ({request.billing_cycle})"}


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

@router.post("/complete-setup")
async def add_api_key(
    request_data: AccountSetupRequest, 
    user: User = Depends(get_current_user)
):
    if user.enabled and user.api_provider:
        # User might be trying to re-run setup or change settings.
        # Decide if this is an update or should be disallowed/handled differently.
        # For now, let's allow updates.
        pass
    user.tax_rate = request_data.tax_rate
    user.api_provider = request_data.api_provider
    if request_data.api_provider == ApiProvider.FMP: 
        existing_key = await ApiKey.find_one(ApiKey.key == request_data.api_key)
        if existing_key:
            raise HTTPException(status_code=400, detail="This API key is already in use")
    
        is_valid = await validate_fmp_key(request_data.api_key)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid API key")

        key = ApiKey(request_data.api_key)
        await key.insert()
        # Set IBKR specific fields to None if switching from IBKR to FMP
        # user.ibkr_access_token = None 
        # user.ibkr_refresh_token = None
        # user.ibkr_token_expiry = None
        # user.ibkr_is_connected = False
    elif request_data.api_provider == ApiProvider.IBKR:
        # For IBKR, the primary connection (OAuth tokens) is handled by separate OAuth endpoints.
        # This "/complete-setup" endpoint for an IBKR user is primarily to set the tax_rate
        # and confirm that they've chosen IBKR as their provider.
        # We assume the OAuth flow has already happened if they are at this stage with IBKR.
        
        # Ensure IBKR connection flag is set if it's not already (e.g. if they went through OAuth then came here)
        # This flag (`ibkr_is_connected`) should ideally be set upon successful token exchange in the OAuth callback.
        # if not user.ibkr_is_connected:
        #     # This scenario is unlikely if the frontend guides them properly.
        #     # It means they selected IBKR but haven't completed the OAuth.
        #     # You might want to prompt them or handle this state.
        #     pass
        
        pass
    
    user.enabled = True
    await user.save()
    
    return {"message": "Setup completed successfully"}

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
    if user.account_type != AccountType.PREMIUM:
        raise HTTPException(status_code=403, detail="Premium feature only")
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

        insights = await call_perplexity(portfolio_summary)

        # Check if the response indicates an error by inspecting the content
        if "Failed to generate insights" not in insights["content"]:
            response = {
                "portfolio_insights": insights["content"],
                "citations": insights["citations"],
                "sentiments": {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            # Only cache if no error occurred
            await cache_manager.redis.setex(cache_key, 43200, json.dumps(response))
        else:
            # Handle the error case (e.g., return the error response without caching)
            response = {
                "portfolio_insights": insights["content"],
                "citations": insights["citations"],
                "sentiments": {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        return response
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating AI insights: {str(e)}"
        )


@router.get("/ai/sentiment/{ticker}")
async def get_ticker_sentiment(
    ticker: str, request: Request, user: User = Depends(get_current_user)
):
    if user.account_type != AccountType.PREMIUM:
        raise HTTPException(status_code=403, detail="Premium feature only")
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
