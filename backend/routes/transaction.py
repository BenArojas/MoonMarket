from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from util.current_user import current_user
from models.user import User
from models.stock import Stock
from models.transaction import Transaction
from models.user import Holding
import pytz

router = APIRouter(tags=["Transaction"])

@router.post("/buy_stock")
async def buy_stock_shares(
    price: float, 
    ticker: str, 
    quantity: int, 
    transaction_date: datetime,
    user: User = Depends(current_user)
):
    # Convert the received datetime to UTC if it isn't already
    if transaction_date.tzinfo is None:
        transaction_date = pytz.UTC.localize(transaction_date)
    else:
        transaction_date = transaction_date.astimezone(pytz.UTC)

    # Compare with current UTC time
    current_time = datetime.now(pytz.UTC)
    
    if transaction_date > current_time:
        raise HTTPException(status_code=400, detail="Transaction date cannot be in the future")

    # Fetch the stock from the database
    stock = await Stock.find_one(Stock.ticker == ticker)

    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    # Calculate the total cost of the purchase
    total_cost = price * quantity

    # Check if the user has enough money in the current_balance to buy the stock
    if user.current_balance < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    # Deduct the cost of the purchase from the user's current_balance
    user.current_balance -= total_cost

    # Update the user's holdings
    for holding in user.holdings:
        if holding.ticker == ticker:
            # Update the average bought price and quantity of the holding
            holding.avg_bought_price = (
                (holding.avg_bought_price * holding.quantity) + (price * quantity)
            ) / (holding.quantity + quantity)
            holding.quantity += quantity
            text = f"Bought {quantity} shares of {ticker} at {price}$ per share"
            break
    else:
        # If the user does not have a holding of this stock, create a new one
        user.holdings.append(
            Holding(
                ticker=ticker,
                avg_bought_price=price,
                quantity=quantity,
                position_started=transaction_date  # Use the provided date
            )
        )
        text = f"Started a position: Bought {quantity} shares of {ticker}"

    # Create a new Transaction for the purchase
    transaction = Transaction(
        user_id=str(user.id),
        title="Stock purchase",
        text=text,
        type="purchase",
        ticker=ticker,
        name=stock.name,
        price=price,
        quantity=quantity,
        transaction_date=transaction_date  # Use the provided date
    )
    
    await transaction.insert()
    user.transactions.append(transaction.id)

    # Save the updated user document back to the database
    await user.save()

    return {"message": "Stock purchased successfully"}

@router.post("/sell_stock")
async def sell_stock_shares(ticker: str, quantity: int, price: float, transaction_date: datetime, user: User = Depends(current_user)):
    # Convert the received datetime to UTC if it isn't already
    if transaction_date.tzinfo is None:
        transaction_date = pytz.UTC.localize(transaction_date)
    else:
        transaction_date = transaction_date.astimezone(pytz.UTC)

    # Compare with current UTC time
    current_time = datetime.now(pytz.UTC)
    
    if transaction_date > current_time:
        raise HTTPException(status_code=400, detail="Transaction date cannot be in the future")
    
    # Fetch the stock from the database
    stock = await Stock.find_one(Stock.ticker == ticker)

    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    # Update the user's holdings
    for index, holding in enumerate(user.holdings):
        if holding.ticker == ticker:
            # Check if the user owns enough shares to sell
            if holding.quantity < quantity:
                raise HTTPException(status_code=400, detail="You can't sell more shares than you own")

            # Update the quantity of the holding
            holding.quantity -= quantity
            text=f"Sold {quantity} shares of {ticker}"

            # If number of shares sold is the number of shares owned, remove the holding
            if holding.quantity == 0:
                user.holdings.pop(index)
                text=f"Closed position: fully sold all remaining ({quantity}) shares of {ticker}"
            break
    else:
        # If the user does not have a holding of this stock
        raise HTTPException(status_code=404, detail="You can't sell a stock you don't own")

    # Calculate the total cost of the sale
    profit = price * quantity

    # add the profit to the user's current_balance
    user.profit += profit

    # Create a new Transaction for the sale
    transaction = Transaction( user_id=str(user.id),  # Assuming user_id is stored as a string
        title="Stock sale",
        text=text,
        type="sale",
        ticker=ticker,
        name=stock.name,
        price=price,
        quantity=quantity,
        transaction_date=transaction_date)
    await transaction.insert()
    user.transactions.append(transaction.id)

    # Save the updated user document back to the database
    await user.save()

    return {"message": "Stock sold successfully"}
