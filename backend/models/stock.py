from typing import  Annotated, List, Optional
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from datetime import datetime


class Stock(Document):
    name: Annotated[str, Indexed(unique=True)]
    ticker: Annotated[str, Indexed(unique=True)]
    price: float
    earnings: Optional[datetime] = None
    
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Apple",
                "ticker": "AAPL",
                "price": 100.0,
                "earnings": "2024-04-30T08:24:12"
            }
        }
