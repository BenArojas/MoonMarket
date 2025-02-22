import json
from typing import Dict, List
from cache.manager import CacheManager
from models.APIKeyManager import ApiKey
from utils.api_key import get_api_key
from models.stock import Stock
from datetime import datetime, timezone
from models.user import User
from fastapi import Depends, HTTPException
import requests
import aiohttp

BASE_URL = 'https://financialmodelingprep.com/api/v3/'


async def get_stock_price(ticker: str, api_key: ApiKey = Depends(get_api_key)) -> float:
    stock = await Stock.find_one(Stock.ticker == ticker)
    if not stock or (datetime.now(timezone.utc) - stock.last_updated).days > 1:
        # Fetch from FMP using user's ApiKey (simplified)
        stock_quote = await fetch_from_fmp(ticker, api_key)
        price = stock_quote['price']
        await Stock.find_one(Stock.ticker == ticker).update({"$set": {"price": price, "last_updated": datetime.now(timezone.utc)}})
        return price
    return stock.price


async def fetch_from_fmp(ticker: str, api_key: str) -> Dict:
    """
    Asynchronously fetch stock data from FMP using aiohttp.
    Returns a dict with stock quote data, including 'price'.
    """
    url = f"{BASE_URL}quote/{ticker}?apikey={api_key}"
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    raise HTTPException(status_code=response.status, detail="FMP API request failed")
                data = await response.json()
                if not data or "price" not in data[0]:  # Assuming FMP returns a list with one dict
                    raise HTTPException(status_code=400, detail="Invalid FMP response")
                return data[0]  # Return the first (and typically only) quote
        except aiohttp.ClientError as e:
            raise HTTPException(status_code=500, detail=f"FMP API error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
        
        
# Analyze sentiment (using Grok's X search or placeholder)
async def analyze_sentiment(ticker: str, posts: List[str]) -> float:
    # Placeholder: Use my X search or Hugging Face
    positive = sum(1 for post in posts if "great" in post.lower()) / len(posts) * 100 if posts else 0
    return round(positive)


async def fetch_sentiment(ticker: str, cache_manager: CacheManager) -> Dict:
    """
    Fetch or generate sentiment for a ticker, using Redis cache.
    """
    cache_key = f"sentiment:{ticker}"
    cached = await cache_manager.redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # Simulate X posts (replace with real data or my search)
    posts = [
        f"Great earnings for {ticker}",
        f"{ticker} is overvalued",
        f"Strong buy recommendation for {ticker}"
    ]
    sentiment_score = await analyze_sentiment(ticker, posts)
    sentiment = f"{sentiment_score}% positive"
    result = {"sentiment": sentiment, "sample_posts": posts[:2]}  # Limit to 2 posts
    await cache_manager.redis.setex(cache_key, 3600, json.dumps(result))  # Cache for 1 hour
    return result