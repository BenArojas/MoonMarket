from fastapi import Depends, APIRouter, HTTPException
from typing import List
from models.user import User, FriendShow
from models.friend import FriendInfo, HoldingInfo
from models.stock import Stock
from models.friendRequest import FriendRequest, FriendRequestAnswer
from utils.auth_user import get_current_user
from bson import ObjectId


router = APIRouter(tags=["Friends"])

@router.get("/pending_friend_requests_length")
async def get_pending_friend_requests_length(current_user: User = Depends(get_current_user)):
    pending_requests = await FriendRequest.find(
        FriendRequest.to_user.id == current_user.id,
        FriendRequest.status == "pending"
    ).to_list()

    return len(pending_requests)

@router.get("/pending_friend_requests_users")
async def get_pending_friend_requests_users(current_user: User = Depends(get_current_user)):
    pending_requests = await FriendRequest.find(
        FriendRequest.to_user.id == current_user.id,
        FriendRequest.status == "pending"
    ).to_list()
    
    from_users = []
    for request in pending_requests:
        from_user_id = request.from_user.ref.id
        from_user =await User.get(from_user_id)
        if from_user:
            from_users.append(FriendShow(
                email=from_user.email,
                username=from_user.username,
                request_id=str(request.id)
            ))

    return from_users

@router.get("/sent_friend_requests")
async def get_sent_friend_requests(current_user: User = Depends(get_current_user)):
    pending_requests = await FriendRequest.find(
    FriendRequest.from_user.id == current_user.id,
    FriendRequest.status == "pending").to_list()
    to_users =[]
    for request in pending_requests:
        to_user_id = request.to_user.ref.id
        to_user =await User.get(to_user_id)
        if to_user:
            to_users.append(FriendShow(
                email=to_user.email,
                username=to_user.username,
                request_id=str(request.id)
            ))
    return to_users
        

@router.post("/send_friend_request/{username}")
async def send_friend_request(username: str, current_user: User = Depends(get_current_user)):
    to_user = await User.find_one(User.username == username)
    if not to_user:
        raise HTTPException(status_code=404, detail="User not found")
    if to_user in current_user.friends:
        raise HTTPException(status_code=400, detail="User is already a friend")

    # Check if I sent a request to them
    outgoing_request = await FriendRequest.find_one(
        FriendRequest.from_user.id == current_user.id,
        FriendRequest.to_user.id == to_user.id,
        FriendRequest.status == "pending"
    )
    if outgoing_request:
        raise HTTPException(
            status_code=400,
            detail="You already have a pending friend request to this user"
        )

    # Check if they sent a request to me
    incoming_request = await FriendRequest.find_one(
        FriendRequest.from_user.id == to_user.id,
        FriendRequest.to_user.id == current_user.id,
        FriendRequest.status == "pending"
    )
    if incoming_request:
        raise HTTPException(
            status_code=400,
            detail="This user has already sent you a friend request. Please respond to their request instead"
        )

    await current_user.send_friend_request(to_user)
    return {"message": "Friend request sent"}

@router.post("/handle_friend_request/{request_id}")
async def handle_friend_request(
    request_id: str,
    answer: FriendRequestAnswer,
    current_user: User = Depends(get_current_user)
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
        if answer == FriendRequestAnswer.accept:
            await current_user.accept_friend_request(friend_request, from_user)
            message = "Friend request accepted"
        elif answer == FriendRequestAnswer.reject:
            await current_user.reject_friend_request(friend_request, from_user)
            message = "Friend request rejected"
        
        # Fetch the request again to confirm changes
        updated_request = await FriendRequest.get(request_id)
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while processing the request")

    return {"message": message}

@router.get("/get_friendList")
async def get_friendList(current_user: User = Depends(get_current_user)):
    friend_list = []
    for friend_id in current_user.friends:
        user = await User.get(friend_id)
        if not user:
            continue
        friend_detail = {
            "id": str(friend_id),  
            "username": user.username,
            "email": user.email,
        }
        friend_list.append(friend_detail)
    return friend_list
    

@router.get("/get_friends_and_user_holdings", response_model=List[FriendInfo])
async def get_all_friends(current_user: User = Depends(get_current_user)):
    friend_info_list = []
    stock_cache = {}
    users = [current_user.id] + current_user.friends

    for user_id in users:
        user = await User.get(user_id)
        if not user:
            continue
        
        holdings_value = 0
        cost_basis = 0  # Total cost of current holdings
        holdings_info = []

        # First pass: Calculate total current holdings value and cost basis
        for holding in user.holdings:
            stock = stock_cache.get(holding.ticker)
            if not stock:
                stock = await Stock.find_one(Stock.ticker == holding.ticker)
                if stock:
                    stock_cache[holding.ticker] = stock
            if stock:
                holding_value = stock.price * holding.quantity
                holdings_value += holding_value
                cost_basis += holding.avg_bought_price * holding.quantity

        # Second pass: Calculate portfolio percentages and create HoldingInfo objects
        for holding in user.holdings:
            stock = stock_cache.get(holding.ticker)
            if stock:
                holding_value = stock.price * holding.quantity

                # Calculate holding percentage of the portfolio
                portfolio_percentage = (holding_value / holdings_value) * 100 if holdings_value > 0 else 0

                # Calculate value change percentage for this holding
                # value_change_percentage = ((stock.price - holding.avg_bought_price) / holding.avg_bought_price) * 100 if holding.avg_bought_price > 0 else 0

                holdings_info.append(HoldingInfo(
                    name=stock.name,
                    portfolio_percentage=portfolio_percentage,
                    # value_change_percentage=value_change_percentage
                ))

        # Calculate unrealized gains/losses percentage for current holdings only
        if cost_basis == 0:
            portfolio_percentage_change = 0 if holdings_value == 0 else 100
        else:
            portfolio_percentage_change = ((holdings_value - cost_basis) / cost_basis) * 100

        friend_info = FriendInfo(
            id=user.id,
            username=user.username,
            email=user.email,
            portfolio_value_change_percentage=portfolio_percentage_change,
            holdings=holdings_info
        )

        friend_info_list.append(friend_info)

    return friend_info_list

@router.delete("/remove-friend/{friend_id}")
async def remove_friend(friend_id: str, current_user: User = Depends(get_current_user)):
    # Convert string ID to ObjectId
    friend_object_id = ObjectId(friend_id)
    
    if friend_object_id not in current_user.friends:
        raise HTTPException(status_code=404, detail="Friend not found in your friend list")
    
    # Remove friend from the list
    current_user.friends.remove(friend_object_id)
    friend = await User.find_one(User.id == friend_object_id)
    if friend:
        friend.friends.remove(current_user.id)
        await friend.save()
    # Update the user in the database
    await current_user.save()
    
    return {"message": "Friend removed successfully"}
    