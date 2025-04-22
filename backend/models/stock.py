from typing import  Annotated, List, Optional
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class Stock(Document):
    name: str
    ticker: Annotated[str, Indexed(unique=True)]
    price: float
    earnings: Optional[datetime] = None
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Apple",
                "ticker": "AAPL",
                "price": 100.0,
                "earnings": "2024-04-30T08:24:12"
            }
        }

class PortfolioRequest(BaseModel):
    tickers: List[str]