
from fastapi import APIRouter, Body, Depends, HTTPException
from models.PortfolioSnapshot import PortfolioSnapshot
from util.current_user import current_user
from models.user import User
import pytz

from beanie import PydanticObjectId

from datetime import datetime



router = APIRouter(prefix="/PortfolioSnapshot", tags=["Stock"])


@router.post("/snapshot")
async def create_snapshot(value: float, user: User = Depends(current_user)):
    now = datetime.utcnow()
    
    # Set the time to midnight UTC to compare only the date
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Find all snapshots for the current day
    existing_snapshots = await PortfolioSnapshot.find(
        PortfolioSnapshot.userId.id == user.id,
        PortfolioSnapshot.timestamp >= start_of_day,
        PortfolioSnapshot.timestamp <= end_of_day
    ).delete()
    
    new_snapshot = PortfolioSnapshot(timestamp=now, value=value, userId=user.id)
    await new_snapshot.insert()
    
    return {"message": "New snapshot created successfully"}

from datetime import datetime
import pytz
from fastapi import Depends
from beanie import PydanticObjectId

@router.get("/daily_snapshots")
async def get_daily_snapshots(user: User = Depends(current_user)):
    # Get the user's snapshots
    user_snapshots = await PortfolioSnapshot.find(PortfolioSnapshot.userId.id == PydanticObjectId(user.id)).sort(-PortfolioSnapshot.timestamp).to_list()

    israel_tz = pytz.timezone('Asia/Jerusalem')
    daily_snapshots = {}

    for snapshot in user_snapshots:
        # Convert UTC timestamp to Israel time
        israel_time = snapshot.timestamp.replace(tzinfo=pytz.UTC).astimezone(israel_tz)
        
        # Extract date in Israel time zone
        snapshot_date = israel_time.date()

        # If the date is not in daily_snapshots, add it
        if snapshot_date not in daily_snapshots:
            daily_snapshots[snapshot_date] = snapshot

    # Convert the daily_snapshots dict to a list of snapshots
    result = list(daily_snapshots.values())
    
    return result