
from fastapi import APIRouter, Body, Depends, HTTPException
from models.PortfolioSnapshot import PortfolioSnapshot
from util.current_user import current_user
from models.user import User
from typing import Annotated
import pytz

from datetime import datetime, time



router = APIRouter(prefix="/PortfolioSnapshot", tags=["Stock"])

@router.post("/snapshot")
async def create_snapshot(value: float , user: User = Depends(current_user)):
    israel_tz = pytz.timezone('Asia/Jerusalem')
    israel_time = datetime.now(israel_tz)
    print(f"Timestamp before insert: {israel_time}")
    snapshot = PortfolioSnapshot(timestamp=israel_time, value=value, userId=user.id)
    await snapshot.insert()
    retrieved_snapshot = await PortfolioSnapshot.get(snapshot.id)
    print(f"Timestamp after retrieval: {retrieved_snapshot.timestamp}")
    return {"message": "Snapshot created successfully"}

@router.get("/{timeframe}")
async def get_snapshots(timeframe: str, user: User = Depends(current_user)):
    israel_tz = pytz.timezone('Asia/Jerusalem')

    def to_israel_time(utc_time):
        return utc_time.replace(tzinfo=pytz.UTC).astimezone(israel_tz)

    if timeframe == "intraday":
        # Return all snapshots for the current day in Israel time
        today = datetime.now(israel_tz).date()
        today_start = datetime.combine(today, time.min)
        today_start_utc = today_start.astimezone(pytz.UTC)
        snapshots = await PortfolioSnapshot.find(
            PortfolioSnapshot.timestamp >= today_start_utc
        ).to_list()
        return [{"timestamp": to_israel_time(s.timestamp), "value": s.value} for s in snapshots]
    
    elif timeframe == "daily":
        # Return the latest snapshot for each day
        pipeline = [
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "latest_snapshot": {"$last": "$$ROOT"}
            }},
            {"$replaceRoot": {"newRoot": "$latest_snapshot"}},
            {"$sort": {"timestamp": 1}}
        ]
        snapshots = await PortfolioSnapshot.aggregate(pipeline).to_list()
        return [{"timestamp": to_israel_time(s["timestamp"]), "value": s["value"]} for s in snapshots]
    
    else:
        raise HTTPException(status_code=400, detail="Invalid timeframe")