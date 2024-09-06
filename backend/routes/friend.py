from fastapi import Depends, APIRouter, HTTPException
from typing import List
from models.user import User
from models.friend import FriendInfo, HoldingInfo
from models.stock import Stock
from models.friendRequest import FriendRequest, FriendRequestAction
from util.current_user import current_user
from routes.user import get_user_transactions_by_type


router = APIRouter()

@router.get("/pending_friend_requests")
async def get_pending_friend_requests(current_user: User = Depends(current_user)):
    pending_requests = await FriendRequest.find(
        FriendRequest.to_user.id == current_user.id,
        FriendRequest.status == "pending"
    ).to_list()
    
    return pending_requests

@router.post("/send_friend_request/{username}")
async def send_friend_request(username: str, current_user: User = Depends(current_user)):
    to_user = await User.find_one(User.username == username)
    if not to_user:
        raise HTTPException(status_code=404, detail="User not found")
    if to_user in current_user.friends:
        raise HTTPException(status_code=400, detail="User is already a friend")
    await current_user.send_friend_request(to_user)
    return {"message": "Friend request sent"}

@router.post("/handle_friend_request/{request_id}")
async def handle_friend_request(
    request_id: str,
    action: FriendRequestAction,
    current_user: User = Depends(current_user)
):
    friend_request = await FriendRequest.get(request_id)
    if not friend_request:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    to_user = await friend_request.to_user.fetch()
    from_user = await friend_request.from_user.fetch()

    if to_user.id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to handle this friend request")

    if friend_request.status != "pending":
        raise HTTPException(status_code=400, detail="Friend request is not pending")

    try:
        if action == FriendRequestAction.accept:
            await current_user.accept_friend_request(friend_request, from_user)
            message = "Friend request accepted"
        elif action == FriendRequestAction.reject:
            await current_user.reject_friend_request(friend_request, from_user)
            message = "Friend request rejected"
        
        # Fetch the request again to confirm changes
        updated_request = await FriendRequest.get(request_id)
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while processing the request")

    return {"message": message}

@router.get("/get_friendList")
async def get_friendList(current_user: User = Depends(current_user)):
    friend_list = []
    for user_id in current_user.friends:
        user = await User.get(user_id)
        if not user:
            continue
        friend_detail = {
            "id":user_id,
            "username": user.username,
            "email": user.email,
        }
        friend_list.append(friend_detail)
    return friend_list
    

@router.get("/get_friends_and_user_holdings", response_model=List[FriendInfo])
async def get_all_friends(current_user: User = Depends(current_user)):
    friend_info_list = []
    stock_cache = {}
    users = [current_user.id] + current_user.friends

    for user_id in users:
        user = await User.get(user_id)
        if not user:
            continue
        

        # Calculate portfolio value change percentage
        user_purchases = await get_user_transactions_by_type("purchase", user)
        initial_portfolio_value = sum(transaction.price * transaction.quantity for transaction in user_purchases)
        # print("Initial portfolio value is", initial_portfolio_value)

        user_sales = await get_user_transactions_by_type("sale", user)
        cash_from_sales = sum(transaction.price * transaction.quantity for transaction in user_sales)
        # print("cash from sales is:", cash_from_sales)

        holdings_value = 0
        holdings_info = []

        # First pass: Calculate total holdings value
        for holding in user.holdings:
            stock = stock_cache.get(holding.ticker)
            if not stock:
                stock = await Stock.find_one(Stock.ticker == holding.ticker)
                if stock:
                    stock_cache[holding.ticker] = stock
            if stock:
                holding_value = stock.price * holding.quantity
                holdings_value += holding_value

        # Calculate total portfolio value
        total_portfolio_value = holdings_value + cash_from_sales
        # print("total portfolio value is:", total_portfolio_value)

        # Second pass: Calculate portfolio percentages and create HoldingInfo objects
        for holding in user.holdings:
            stock = stock_cache.get(holding.ticker)
            if stock:
                holding_value = stock.price * holding.quantity

                # Calculate holding percentage of the portfolio
                portfolio_percentage = (holding_value / total_portfolio_value) * 100 if total_portfolio_value > 0 else 0

                # Calculate value change percentage for this holding
                value_change_percentage = ((stock.price - holding.avg_bought_price) / holding.avg_bought_price) * 100 if holding.avg_bought_price > 0 else 0

                holdings_info.append(HoldingInfo(
                    name=stock.name,
                    portfolio_percentage=portfolio_percentage,
                    value_change_percentage=value_change_percentage
                ))

        # Handle case where initial_portfolio_value is zero
        if initial_portfolio_value == 0:
            portfolio_percentage_change = 0 if total_portfolio_value == 0 else 100  # 100% increase if starting from 0
        else:
            portfolio_percentage_change = ((total_portfolio_value - initial_portfolio_value) / initial_portfolio_value) * 100

        friend_info = FriendInfo(
            id=user.id,
            username=user.username,
            email=user.email,
            portfolio_value_change_percentage=portfolio_percentage_change,
            holdings=holdings_info
        )

        friend_info_list.append(friend_info)

    return friend_info_list