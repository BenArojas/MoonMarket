
from fastapi import APIRouter, Body, Depends, HTTPException
from models.PortfolioSnapshot import PortfolioSnapshot
from util.current_user import current_user
from models.user import User
from typing import Annotated
import pytz
from itertools import groupby
from operator import itemgetter
from beanie import PydanticObjectId

from datetime import datetime, time



router = APIRouter(prefix="/PortfolioSnapshot", tags=["Stock"])

@router.post("/snapshot")
async def create_snapshot(value: float , user: User = Depends(current_user)):
    israel_tz = pytz.timezone('Asia/Jerusalem')
    israel_time = datetime.now(israel_tz)
    snapshot = PortfolioSnapshot(timestamp=israel_time, value=value, userId=user.id)
    await snapshot.insert()
    retrieved_snapshot = await PortfolioSnapshot.get(snapshot.id)
    return {"message": "Snapshot created successfully"}

# @router.get("/daily_snapshots")
# async def get_daily_snapshots(user: User = Depends(current_user)):
    # israel_tz = pytz.timezone('Asia/Jerusalem')

    # def to_israel_time(utc_time):
    #     return utc_time.replace(tzinfo=pytz.UTC).astimezone(israel_tz)

#     pipeline = [
#         {"$match": {"userId": PydanticObjectId(user.id)}},
#         {"$group": {
#             "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
#             "latest_snapshot": {"$last": "$$ROOT"}
#         }},
#         {"$replaceRoot": {"newRoot": "$latest_snapshot"}},
#         {"$sort": {"timestamp": 1}}
#     ]
    
#     snapshots = await PortfolioSnapshot.aggregate(pipeline).to_list()
    
    # return [
    #     {
    #         "timestamp": to_israel_time(s["timestamp"]),
    #         "value": s["value"],
    #         "userId": str(s["userId"])
    #     } for s in snapshots
    # ]

@router.get("/daily_snapshots")
async def get_daily_snapshots(user: User = Depends(current_user)):
    # Get the user's snapshots
    user_snapshots = await PortfolioSnapshot.find(PortfolioSnapshot.userId.id == PydanticObjectId(user.id)).sort(-PortfolioSnapshot.timestamp).to_list()

    daily_snapshots = {}
    for snapshot in user_snapshots:
        # Convert timestamp to date only (YYYY-MM-DD)
        snapshot_date = snapshot.timestamp.date()

        # If the date is not in daily_snapshots, add it
        if snapshot_date not in daily_snapshots:
            daily_snapshots[snapshot_date] = snapshot

    # Convert the daily_snapshots dict to a list of snapshots
    result = list(daily_snapshots.values())
    
    return result
