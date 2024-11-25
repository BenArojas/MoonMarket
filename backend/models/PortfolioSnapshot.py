from beanie import Document, Link
from datetime import datetime
from pydantic import BaseModel, Field
from models.user import User

class PortfolioSnapshot(Document):
    timestamp: datetime
    value: float
    userId: Link[User]
    cumulativeSpent: float = Field(default=0)

    class Config:
       json_schema_extra = {
            "example": {
                "timestamp": "2024-04-30T08:24:12",
                "value": 10020,
                "userId": "60c72b2f8fd0b62247f3a9e2",
                "cumulativeSpent": 1200,  # Example amount spent
            }
        }