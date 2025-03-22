import asyncio
import json
import logging
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
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

BASE_URL = 'https://financialmodelingprep.com/api/v3/'
APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")  


async def scrape_x_posts(ticker: str, max_posts: int = 50) -> List[dict]:
    client = ApifyClient(APIFY_API_TOKEN)
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

    # Define keyword lists
    bullish_keywords = [
        "up", "higher", "gains", "rally", "surge", "moon", "pump", "breakout", "bull", "bullish",
        "buy", "long", "hodl", "strong", "solid", "rocket", "beats", "outperform", "growth", "📈", "🟢"
    ]
    bearish_keywords = [
        "down", "lower", "drops", "plunge", "dump", "crash", "breakdown", "bear", "bearish",
        "sell", "short", "weak", "falling", "misses", "underperform", "decline", "📉", "🔴"
    ]
    boost_factor = 0.15  # Adjust this value (0.1 to 0.3) based on testing

    analyzer = SentimentIntensityAnalyzer()
    scores = []
    
    for post in posts:
        text = post["text"].lower()  # Case-insensitive matching
        score = analyzer.polarity_scores(post["text"])
        
        # Apply keyword boosts
        pos_boost = sum(1 for kw in bullish_keywords if kw in text) * boost_factor
        neg_boost = sum(1 for kw in bearish_keywords if kw in text) * boost_factor
        
        # Check for percentage changes (e.g., "+7.43%" or "-12%")
        if "+" in text and any(c.isdigit() for c in text):
            pos_boost += boost_factor
        elif "-" in text and any(c.isdigit() for c in text):
            neg_boost += boost_factor

        # Adjust scores
        score["pos"] = min(1.0, score["pos"] + pos_boost)  # Cap at 1.0
        score["neg"] = min(1.0, score["neg"] + neg_boost)
        score["neu"] = max(0.0, 1.0 - score["pos"] - score["neg"])  # Recalculate neutral
        
        # Weight by likes (optional, keep if desired)
        weight = 1 + (post["favorite_count"] / 100)
        scores.append({k: v * weight for k, v in score.items() if k in ["pos", "neg", "neu"]})

    # Average scores
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
    logger.info(f"Sending request to URL: {url}")  # Log the URL before the request
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    response_text = await response.text()
                    logger.error(f"Failed to fetch from FMP for ticker {ticker}. URL: {url}, Status: {response.status}, Response: {response_text}")
                    raise HTTPException(status_code=response.status, detail=f"FMP API request failed: {response_text}")
                
                data = await response.json()
                if not data:
                    logger.error(f"Invalid FMP response for ticker {ticker}. URL: {url}, Data: {data}")
                    raise HTTPException(status_code=400, detail="Invalid FMP response")
                
                return data 
        
        except aiohttp.ClientError as e:
            logger.error(f"FMP API error for ticker {ticker}. URL: {url}, Error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"FMP API error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error for ticker {ticker}. URL: {url}, Error: {str(e)}")
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
            "neutral_pct": 0,  # Added
            "post_count": 0,
            "activity": "No activity",
            "time_range": "N/A",
            "sample_posts": ["Unable to fetch posts"],
            "top_post": None,
        }
    else:
        # Analyze sentiment with weights
        sentiment_scores = await analyze_sentiment(ticker, posts)
        total = sum(sentiment_scores.values()) or 1
        bullish_pct = (sentiment_scores["positive"] / total) * 100
        bearish_pct = (sentiment_scores["negative"] / total) * 100
        neutral_pct = (sentiment_scores["neutral"] / total) * 100

        # Adjusted sentiment label (lower threshold)
        sentiment_label = (
            "bullish" if bullish_pct > 30 or (bullish_pct > bearish_pct + 10)
            else "bearish" if bearish_pct > 30 or (bearish_pct > bullish_pct + 10)
            else "neutral"
        )

        # Volume Context
        post_count = len(posts)
        activity = "Low activity" if post_count < 10 else "Normal activity"

        # Time range
        oldest_post_time = min(
            [datetime.strptime(post["created_at"], "%a %b %d %H:%M:%S %z %Y").astimezone(pytz.utc) for post in posts]
        )
        time_diff = now - oldest_post_time
        hours = int(time_diff.total_seconds() / 3600)
        time_range = f"last {hours} hours" if hours < 24 else f"last {int(hours / 24)} days"

        # Top post
        top_post = max(posts, key=lambda p: p["favorite_count"], default=None)
        top_post_data = {"text": top_post["text"], "likes": top_post["favorite_count"]} if top_post else None

        result = {
            "sentiment": sentiment_label,
            "bullish_pct": int(bullish_pct),
            "bearish_pct": int(bearish_pct),
            "neutral_pct": int(neutral_pct),  # Added
            "post_count": post_count,
            "activity": activity,
            "time_range": time_range,
            "sample_posts": [p["text"] for p in posts[:2]],
            "top_post": top_post_data,
        }

    await cache_manager.redis.setex(cache_key, 21600, json.dumps(result))
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
    
async def call_perplexity(portfolio_summary):
    PERPLEXITY_API_TOKEN = os.getenv("PERPLEXITY_API_TOKEN")
    client = AsyncOpenAI(api_key=PERPLEXITY_API_TOKEN, base_url="https://api.perplexity.ai")
    prompt = (
        "Skip reasoning steps and provide only the 3–5 insights. "
        f"Analyze this portfolio with real-time context: {json.dumps(portfolio_summary)}. "
        "Provide 3-5 actionable insights, taking into consideration the current market status (e.g., S&P 500 trends), "
        "inflation trends (e.g., latest CPI data), Federal Reserve policy (e.g., recent rate decisions or statements), "
        "sector performance, and recent news impacting these holdings. Include specific stock or ETF recommendations "
        "(e.g., ticker symbols) for diversification or hedging, and suggest detailed strategies (e.g., allocation percentages, "
        "stop-loss levels, or options plays) tailored to my portfolio."
    )
    try:
        response = await client.chat.completions.create(
            model="sonar-deep-research",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2500
        )
        # Return a dictionary with content and citations
        return {
            "content": response.choices[0].message.content,
            "citations": getattr(response, "citations", [])  # Use getattr to safely handle if citations aren't present
        }
    except Exception as e:
        print(f"Error calling Perplexity API: {str(e)}")
        return {
            "content": f"Failed to generate insights due to an error: {str(e)}",
            "citations": []
        }