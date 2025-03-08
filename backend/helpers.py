import asyncio
import json
from typing import Dict, List
from models import PortfolioSnapshot
from models.transaction import Transaction
from utils.auth_user import get_current_user
from cache.manager import CacheManager
from models.APIKeyManager import ApiKey
from utils.api_key import get_api_key
from models.stock import Stock
from datetime import datetime, timezone
from models.user import User
from fastapi import Depends, HTTPException
import aiohttp
from aiohttp import ClientSession
from apify_client import ApifyClient
import os
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import pytz

BASE_URL = 'https://financialmodelingprep.com/api/v3/'
APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")  
apify_client = ApifyClient(APIFY_API_TOKEN)
analyzer = SentimentIntensityAnalyzer()

async def scrape_x_posts(ticker: str, max_posts: int = 50) -> List[dict]:
    client = ApifyClient(os.getenv("APIFY_API_TOKEN"))
    run_input = {
        "twitterContent": f"{ticker} #{ticker} ${ticker}",
        "maxItems": max_posts,
        "queryType": "Latest",
        "lang": "en",
        "filter:links": False
    }
    try:
        run = client.actor("kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest").call(run_input=run_input)
        posts = client.dataset(run["defaultDatasetId"]).list_items().items
        return [{"text": post["text"], "created_at": post["createdAt"], "favorite_count": post.get("likeCount", 0)} for post in posts]
    except Exception as e:
        print(f"Apify error for {ticker}: {str(e)}")
        return []
    
async def analyze_sentiment(ticker: str, posts: List[dict]) -> Dict[str, float]:
    if not posts:
        return {"positive": 0, "negative": 0, "neutral": 0}
    analyzer = SentimentIntensityAnalyzer()
    scores = [analyzer.polarity_scores(post["text"]) for post in posts]
    avg_scores = {
        "positive": sum(s["pos"] for s in scores) / len(scores),
        "negative": sum(s["neg"] for s in scores) / len(scores),
        "neutral": sum(s["neu"] for s in scores) / len(scores),
    }
    return avg_scores


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
        


async def fetch_sentiment(ticker: str, cache_manager: CacheManager) -> Dict:
    cache_key = f"sentiment:{ticker}"
    cached = await cache_manager.redis.get(cache_key)
    if cached:
        return json.loads(cached)

    posts = await scrape_x_posts(ticker, max_posts=50)
    now = datetime.now(timezone.utc)

    if not posts:
        result = {
            "sentiment": "No data",
            "bullish_pct": 0,
            "bearish_pct": 0,
            "post_count": 0,
            "activity": "No activity",
            "time_range": "N/A",
            "sample_posts": ["Unable to fetch posts"],
            "top_post": None,
        }
    else:
        # Analyze sentiment
        sentiment_scores = await analyze_sentiment(ticker, posts)
        total = sum(sentiment_scores.values()) or 1
        bullish_pct = (sentiment_scores["positive"] / total) * 100
        bearish_pct = (sentiment_scores["negative"] / total) * 100
        sentiment_label = "bullish" if bullish_pct > 50 else "bearish" if bearish_pct > 50 else "neutral"

        # Volume Context
        post_count = len(posts)
        activity = "Low activity" if post_count < 10 else "Normal activity"

        now = datetime.now(pytz.utc)
        oldest_post_time = min(
            [datetime.strptime(post["created_at"], "%a %b %d %H:%M:%S %z %Y").astimezone(pytz.utc) for post in posts]
        )
        time_diff = now - oldest_post_time
        hours = int(time_diff.total_seconds() / 3600)
        time_range = f"last {hours} hours" if hours < 24 else f"last {int(hours / 24)} days"

        # Top post by likes
        top_post = max(posts, key=lambda p: p["favorite_count"], default=None)
        top_post_data = {"text": top_post["text"], "likes": top_post["favorite_count"]} if top_post else None

        result = {
            "sentiment": sentiment_label,
            "bullish_pct": int(bullish_pct),
            "bearish_pct": int(bearish_pct),
            "post_count": post_count,
            "activity": activity,
            "time_range": time_range,
            "sample_posts": [p["text"] for p in posts[:2]],
            "top_post": top_post_data,
        }

    await cache_manager.redis.setex(cache_key, 21600, json.dumps(result))  # 6 hours
    return result


async def get_user_portfolio_data(user: User = Depends(get_current_user)) -> dict:

    # Get holdings
    holdings = user.holdings
    tickers = [h.ticker for h in holdings]

    # Get current stock prices (via FMP or Stock model)
    async with ClientSession() as session:
        tasks = [get_stock_price(ticker, user.api_key.key, session) for ticker in tickers]
        stock_prices = await asyncio.gather(*tasks, return_exceptions=True)

    # Get transactions
    transactions = await Transaction.find(Transaction.user_id == user.id).to_list()
    snapshots = await PortfolioSnapshot.find(PortfolioSnapshot.userId == user.id).sort(
        PortfolioSnapshot.timestamp
    ).to_list()

    return {
        "holdings": holdings,
        "stock_prices": {tickers[i]: price for i, price in enumerate(stock_prices) if not isinstance(price, Exception)},
        "transactions": transactions,
        "snapshots": snapshots,
        "user": user
    }
    
