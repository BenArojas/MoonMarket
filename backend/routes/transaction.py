from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from utils.auth_user import get_current_user
from models.user import User, YearlyExpenses
from models.stock import Stock
from models.transaction import Transaction
from models.user import Holding
import pytz
from beanie import PydanticObjectId

router = APIRouter(tags=["Transaction"])

@router.post("/buy_stock")
async def buy_stock_shares(
    price: float, 
    ticker: str, 
    quantity: int, 
    transaction_date: datetime,
    commission: float, 
    user: User = Depends(get_current_user)
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
    total_cost = price * quantity + commission

    # Check if the user has enough money in the current_balance to buy the stock
    if user.current_balance < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient funds")

    # Update yearly expenses for commission
    transaction_year = transaction_date.year
    year_expense = next((exp for exp in user.yearly_expenses if exp.year == transaction_year), None)
    
    if year_expense:
        year_expense.commission_paid += commission
    else:
        user.yearly_expenses.append(YearlyExpenses(
            year=transaction_year,
            commission_paid=commission,
            taxes_paid=0
        ))

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
                position_started=transaction_date
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
        transaction_date=transaction_date,
        commission=commission
    )
    
    await transaction.insert()
    user.transactions.append(transaction.id)

    # Save the updated user document back to the database
    await user.save()

    return {"message": "Stock purchased successfully"}

@router.post("/sell_stock")
async def sell_stock_shares(
    ticker: str, 
    quantity: int, 
    price: float, 
    commission: float, 
    transaction_date: datetime, 
    user: User = Depends(get_current_user)
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

    # Find the holding to calculate profit
    holding = None
    holding_index = None
    for index, h in enumerate(user.holdings):
        if h.ticker == ticker:
            holding = h
            holding_index = index
            break

    if not holding:
        raise HTTPException(status_code=404, detail="You can't sell a stock you don't own")

    if holding.quantity < quantity:
        raise HTTPException(status_code=400, detail="You can't sell more shares than you own")

    # Calculate profit/loss
    sale_revenue = price * quantity
    cost_basis = holding.avg_bought_price * quantity
    profit_before_commission = sale_revenue - cost_basis
    profit_after_commission = profit_before_commission - commission

    # Calculate tax if there's a profit
    tax_amount = 0
    if profit_after_commission > 0:
        tax_amount = profit_after_commission * 0.25  # 25% tax rate

    # Update yearly expenses
    transaction_year = transaction_date.year
    year_expense = next((exp for exp in user.yearly_expenses if exp.year == transaction_year), None)
    
    if year_expense:
        year_expense.commission_paid += commission
        year_expense.taxes_paid += tax_amount
    else:
        user.yearly_expenses.append(YearlyExpenses(
            year=transaction_year,
            commission_paid=commission,
            taxes_paid=tax_amount
        ))

    # Update the holding
    holding.quantity -= quantity
    text = f"Sold {quantity} shares of {ticker}"

    # If all shares are sold, remove the holding
    if holding.quantity == 0:
        user.holdings.pop(holding_index)
        text = f"Closed position: fully sold all remaining ({quantity}) shares of {ticker}"

    # Update user's profit (after commission and tax)
    final_profit = profit_after_commission - tax_amount
    user.profit += final_profit

    # Create a new Transaction for the sale
    transaction = Transaction(
        user_id=str(user.id),
        title="Stock sale",
        text=text,
        type="sale",
        ticker=ticker,
        name=stock.name,
        price=price,
        quantity=quantity,
        transaction_date=transaction_date,
        commission=commission
    )
    await transaction.insert()
    user.transactions.append(transaction.id)

    # Save the updated user document back to the database
    await user.save()

    return {"message": "Stock sold successfully"}

@router.delete("/delete_transaction/{transaction_id}")
async def delete_transaction(transaction_id: str, user: User = Depends(get_current_user)):
    # Find the transaction
    # Convert string ID to PydanticObjectId
    transaction_obj_id = PydanticObjectId(transaction_id)
    transaction = await Transaction.get(transaction_obj_id)
    
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if str(transaction.user_id.ref.id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this transaction")


    # Handle the transaction based on its type
    if transaction.type == "purchase":
        await _handle_purchase_deletion(user, transaction)
    elif transaction.type == "sale":
        await _handle_sale_deletion(user, transaction)
    else:
        raise HTTPException(status_code=400, detail="Invalid transaction type")
    
    # Remove transaction from user's transactions list
    if transaction.id in user.transactions:
        user.transactions.remove(transaction.id)
    
    # Delete the transaction and save user changes
    await transaction.delete()
    await user.save()
    
    return {"message": "Transaction deleted successfully"}

async def _handle_purchase_deletion(user: User, transaction: Transaction):
    """Handle deletion of a purchase transaction"""
    # Find the corresponding holding
    holding = next((h for h in user.holdings if h.ticker == transaction.ticker), None)
    
    if not holding:
        raise HTTPException(
            status_code=400,
            detail="Holding not found. Data inconsistency detected."
        )
    
    # Check if we can remove these shares
    if holding.quantity < transaction.quantity:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete transaction: would result in negative shares"
        )
    
    # Refund the purchase amount
    purchase_cost = transaction.price * transaction.quantity + transaction.commission
    user.current_balance += purchase_cost
    
    # Update or remove the holding
    if holding.quantity == transaction.quantity:
        # This was the only purchase for this stock, remove the holding
        user.holdings.remove(holding)
    else:
        # Recalculate average purchase price by removing this transaction's impact
        remaining_quantity = holding.quantity - transaction.quantity
        total_cost = holding.avg_bought_price * holding.quantity
        transaction_cost = transaction.price * transaction.quantity
        
        if remaining_quantity > 0:
            new_avg_price = (total_cost - transaction_cost) / remaining_quantity
            holding.quantity = remaining_quantity
            holding.avg_bought_price = new_avg_price
        else:
            # If no shares remain, remove the holding
            user.holdings.remove(holding)

async def _handle_sale_deletion(user: User, transaction: Transaction):
    """Handle deletion of a sale transaction"""
    # Find or create corresponding holding
    holding = next((h for h in user.holdings if h.ticker == transaction.ticker), None)
    
    # Remove the profit from the user's account
    sale_amount = transaction.price * transaction.quantity- transaction.commission
    if user.current_balance < sale_amount:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete transaction: insufficient funds to reverse sale"
        )
    
    user.profit -= sale_amount
    
    if holding:
        # Add back the sold shares to existing holding
        holding.quantity += transaction.quantity
    else:
        # Create new holding if it was fully sold before
        user.holdings.append(
            Holding(
                ticker=transaction.ticker,
                avg_bought_price=transaction.price,  # Use the sale price as we don't have the original purchase price
                quantity=transaction.quantity,
                position_started=transaction.transaction_date
            )
        )