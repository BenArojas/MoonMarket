from typing import List
from bson import ObjectId
from beanie import Document, Link
from datetime import datetime
from pydantic import BaseModel
from models.user import User

class Transaction(Document):
    user_id: Link[User]  # Reference to the user who performed the activity
    title: str            # Title of the Transaction entry
    text: str             # Additional details or description
    type: str             # Type of activity (e.g., "purchase" or "sale")
    # change to enum type emum[purchase, sale]
    ticker: str           # Ticker symbol of the stock involved in the activity
    name: str             # Name of the stock
    price: float          # Price per share at the time of the activity
    quantity: float       # Quantity of shares involved in the activity
    transaction_date: datetime  # Date of the transaction
    commission: float 

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "60c72b2f8fd0b62247f3a9e2",  # Example ObjectId
                "title": "Initial purchase",
                "text": "Bought 10 shares of AAPL",
                "type": "purchase",
                "ticker": "AAPL",
                "name": "Apple",
                "price": 100.0,
                "quantity": 10,
                "transaction_date": "2024-04-30T08:24:12",
                "commission": 5
            }
        }
