"""User router."""

from typing import Optional
from cache.manager import CacheManager
from fastapi import APIRouter, Depends, HTTPException, Response, Security, Request
from models.user import User, UserOut, PasswordChangeRequest, Deposit, UserFriend, YearlyExpenses
from fastapi.responses import JSONResponse
from utils.auth_user import get_current_user
from models.transaction import Transaction
from models.stock import Stock
from models.PortfolioSnapshot import PortfolioSnapshot
from utils.password import hash_password, verify_password



router = APIRouter( tags=["User"])


@router.get("/", response_model=UserOut, operation_id="retrieve_user")
async def get_user(user: User = Depends(get_current_user)):  # type: ignore[no-untyped-def]
    """Return the current user."""
    return user

@router.get("/name", operation_id="retrieve_user_name")
async def get_user_name(user: User = Depends(get_current_user)): 
    """Return the current user first name."""
    return user.username

@router.get("/user_transactions", operation_id="retrieve_user_transactions")
async def get_user_transactions(user: User = Depends(get_current_user)):
    # Retrieve transactions for the specified user ID
    # transactions = await Transaction.get_Transactions_by_user(current_user.id)
    transactions = await Transaction.find(Transaction.user_id.id == user.id).to_list()
    # Return the list of transactions
    return transactions

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

@router.get("/user_transactions/{type}",response_model=UserOut, operation_id="retrieve_user_transactions_by_type")
async def get_user_transactions_by_type(type: str, user: User = Depends(get_current_user)):
    # Retrieve transactions for the specified user ID
    transactions = await Transaction.find(Transaction.user_id.id == user.id, Transaction.type == type).to_list()
    # Return the list of transactions
    return transactions

@router.get("/user_friend/{username}", response_model=UserFriend)
async def get_user_by_username(username: str, current_user: User = Depends(get_current_user)):

    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Cannot retrieve your own profile as a friend")

    user =await User.find_one(User.username == username)

    if user:
        if user.id in current_user.friends:
            raise HTTPException(status_code=400, detail="User is already your friend")
        return UserFriend(email=user.email, username=user.username)
    raise HTTPException(status_code=404, detail="User not found")

@router.get("/users_list")
async def users_list(current_user: User = Depends(get_current_user)):
    users = [{"id": str(current_user.id), "username": current_user.username, "email": current_user.email}]
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
async def add_deposit(deposit:Deposit,request: Request, user:User = Depends(get_current_user)):
    """Add deposit to user account."""
    user.deposits.append(deposit)
    user.current_balance+=deposit.amount
    await user.save()
    
    cache_manager = CacheManager(request)
    await cache_manager.cache_user(user)
    return user


@router.patch("/update-username", operation_id="update_user_details")
async def update_user(new_username: str, request: Request, user: User = Depends(get_current_user)) -> str:  
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
async def update_password(request: PasswordChangeRequest, http_request: Request, user:User = Depends(get_current_user)):
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
        status_code=200,
        content={
            "message": "Password changed successfully"
        }
    )

def get_year_expenses(user: User, year: int) -> Optional[YearlyExpenses]:
    return next((exp for exp in user.yearly_expenses if exp.year == year), None)


@router.delete("/delete", operation_id="delete_user_account")
async def delete_user(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> Response:
    """Delete current user."""
    # Find and delete transactions associated with the user
    await Transaction.find(Transaction.user_id.id == current_user.id).delete()
    await PortfolioSnapshot.find(PortfolioSnapshot.userId.id == current_user.id).delete()

    # End user's session before deletion
    await current_user.end_session(request)

    # Delete the user
    await current_user.delete()

    # Create response that will also clear the session cookie
    response = Response(status_code=204)
    response.delete_cookie("session")
    
    return response
