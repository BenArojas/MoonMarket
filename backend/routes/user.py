"""User router."""

from fastapi import APIRouter, Depends, HTTPException, Response, Security
from fastapi_jwt import JwtAuthorizationCredentials

from models.user import User, UserOut, UserUpdate, PasswordChangeRequest, Deposit, UserFriend
from jwt import access_security
from util.current_user import current_user
from models.transaction import Transaction
from util.password import hash_password, verify_password



router = APIRouter(prefix="/user", tags=["User"])


@router.get("", response_model=UserOut, operation_id="retrieve_user")
async def get_user(user: User = Depends(current_user)):  # type: ignore[no-untyped-def]
    """Return the current user."""
    return user

@router.get("/name", operation_id="retrieve_user_name")
async def get_user_name(user: User = Depends(current_user)): 
    """Return the current user first name."""
    return user.username

@router.get("/user_transactions", operation_id="retrieve_user_transactions")
async def get_user_transactions(user: User = Depends(current_user)):
    # Retrieve transactions for the specified user ID
    # transactions = await Transaction.get_Transactions_by_user(current_user.id)
    transactions = await Transaction.find(Transaction.user_id.id == user.id).to_list()
    # Return the list of transactions
    return transactions

@router.get("/user_transactions/{type}",response_model=UserOut, operation_id="retrieve_user_transactions_by_type")
async def get_user_transactions_by_type(type: str, user: User = Depends(current_user)):
    # Retrieve transactions for the specified user ID
    transactions = await Transaction.find(Transaction.user_id.id == user.id, Transaction.type == type).to_list()
    # Return the list of transactions
    return transactions

@router.get("/user_friend/{username}", response_model=UserFriend)
async def get_user_by_username(username: str, current_user: User = Depends(current_user)):
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Cannot retrieve your own profile as a friend")

    user = await User.find_one(User.username == username)
    if user:
        return UserFriend(email=user.email,username=user.username, holdings=user.holdings)
    raise HTTPException(status_code=404, detail="User not found")

@router.get("/get_friends")
async def get_all_friends(current_user: User = Depends(current_user)):
    friends = current_user.friends
    # TODO:loop through friends and for each of them return an object with the following properties: ID, Username, calculate the percentage change of the portfolio profit/loss and return an array of holdings with percentage change of each stock and percentage of the stock in the portfolio 
    return friends
    

@router.post("/add_deposit")
async def add_deposit(deposit:Deposit, user:User = Depends(current_user)):
    """Add deposit to user account."""
    user.deposits.append(deposit)
    user.current_balance+=deposit.amount
    await user.save()
    return user


@router.patch("/update-username", operation_id="update_user_details")
async def update_user(new_username: str, user: User = Depends(current_user)) ->str:  
    """Update allowed user fields."""
    user.username = new_username
    await user.save()
    return user.username

@router.patch("/change_password",response_model=UserOut, operation_id="change_password")
async def update_password(request: PasswordChangeRequest, user:User = Depends(current_user)):
    """change user password."""
    if not verify_password(request.password, user.password):
        raise HTTPException(400, "Passwords do not match")
    # Hash the new password
    hashed_new_password = hash_password(request.new_password)
    # Update the user's password
    user.password = hashed_new_password
    await user.save()
    return user
        


@router.delete("/delete", operation_id="delete_user_account")
async def delete_user(
    auth: JwtAuthorizationCredentials = Security(access_security)
) -> Response:
    """Delete current user."""
    # Find the user
    user = await User.find_one(User.email == auth.subject["username"])
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find and delete transactions associated with the user
    await Transaction.find(Transaction.user_id.id == user.id).delete()

    # Delete the user
    await user.delete()
    return Response(status_code=204)

