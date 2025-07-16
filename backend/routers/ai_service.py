from datetime import date, timedelta
import logging
import httpx
from fastapi import APIRouter, HTTPException, Depends, Body
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import List, Dict, Any
from models import SentimentResponse
from config import APIFY_API_KEY, PERPLEXITY_ANALYSIS_MODEL, PERPLEXITY_API_KEY, PERPLEXITY_REPORT_MODEL

# Initialize router and sentiment analyzer
router = APIRouter(prefix="/ai", tags=["AI Services"])
analyzer = SentimentIntensityAnalyzer()
log = logging.getLogger(__name__)


# --- API KEY DEPENDENCIES ---

def require_apify_key():
    """Dependency to ensure Apify API key is set."""
    if not APIFY_API_KEY:
        raise HTTPException(status_code=412, detail="Apify API key is not configured on the server.")
    return APIFY_API_KEY

def require_perplexity_key():
    """Dependency to ensure Perplexity API key is set."""
    if not PERPLEXITY_API_KEY:
        raise HTTPException(status_code=412, detail="Perplexity API key is not configured on the server.")
    return PERPLEXITY_API_KEY


# --- TWITTER SENTIMENT ENDPOINT ---

@router.get("/stock/{ticker}/sentiment", dependencies=[Depends(require_apify_key)])
async def get_stock_sentiment(ticker: str) -> SentimentResponse:
    """
    Scrapes recent tweets for a stock ticker, calculates sentiment, and
    returns the top positive and negative tweets.
    """
    last_week = (date.today() - timedelta(days=7)).strftime("%Y-%m-%d")
    search_query = f"${ticker} -is:retweet since:{last_week}"
    # search_query = f"(${ticker} AND (stock OR shares OR investing OR holding)) -is:retweet since:{last_week}"
    apify_api_url = f"https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token={APIFY_API_KEY}"

    payload = {
        "twitterContent": search_query,
        "maxItems": 200, # Get a larger sample to find good ones
        "lang": "en",
        "filter:has_engagement": True,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(apify_api_url, json=payload)
            response.raise_for_status()
        tweets = response.json()

        if not tweets or len(tweets) < 10:
            return SentimentResponse(sentiment="neutral", score=0, tweets_analyzed=0, top_positive_tweet=None, top_negative_tweet=None)
        
        analyzed_tweets = []
        for tweet in tweets:
            if 'text' in tweet and 'url' in tweet:
                score = analyzer.polarity_scores(tweet['text'])['compound']
                analyzed_tweets.append({
                    "url": tweet['url'],
                    "text": tweet['text'],
                    "score": score,
                    "likes": tweet.get('likeCount', 0),
                    "retweets": tweet.get('retweetCount', 0)
                })
                
        avg_score = sum(t['score'] for t in analyzed_tweets) / len(analyzed_tweets)
        # Find the "most influential" positive and negative tweets
        # (by score * (likes + retweets))
        top_positive = max([t for t in analyzed_tweets if t['score'] > 0.2], key=lambda x: x['score'] * (x['likes'] + x['retweets'] + 1), default=None)
        top_negative = min([t for t in analyzed_tweets if t['score'] < -0.2], key=lambda x: x['score'] * (x['likes'] + x['retweets'] + 1), default=None)

        if avg_score >= 0.05:
            sentiment = "positive"
        elif avg_score <= -0.05:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        def get_score_label(score: float) -> str:
            if score > 0.6: return "Very Positive"
            if score > 0.2: return "Positive"
            if score >= 0.05: return "Slightly Positive"
            if score < -0.6: return "Very Negative"
            if score < -0.2: return "Negative"
            if score <= -0.05: return "Slightly Negative"
            return "Neutral"

        return SentimentResponse(
            sentiment=sentiment,
            score=round(avg_score, 3),
            score_label=get_score_label(avg_score),
            tweets_analyzed=len(analyzed_tweets),
            top_positive_tweet=top_positive,
            top_negative_tweet=top_negative
        )

    except httpx.HTTPStatusError as e:
        # Log the error for debugging
        print(f"Apify API Error: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail="Failed to fetch sentiment from Apify.")
    except Exception as e:
        print(f"Unexpected Error in get_stock_sentiment: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred.")


# --- PERPLEXITY AI ENDPOINTS ---

async def query_perplexity(prompt: str, model: str, api_key: str):
    """Helper function to call the Perplexity API with a specific model."""
    perplexity_api_url = "https://api.perplexity.ai/chat/completions" # Correct URL
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    
    payload = {
        "model": model, # Use the specified model
        "messages": [
            {
                "role": "system",
                "content": "You are a concise financial analyst. Provide clear, well-structured insights using Markdown. Your tone is helpful and informative, but you must avoid making direct financial advice or recommendations."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(perplexity_api_url, json=payload, headers=headers)
            response.raise_for_status()
        
        return response.json() 
    except httpx.HTTPStatusError as e:
        print(f"Perplexity API Error: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail="An error occurred with the Perplexity API.")
    except (KeyError, IndexError) as e:
        print(f"Error parsing Perplexity response: {e}")
        raise HTTPException(status_code=500, detail="Invalid response format from Perplexity.")

@router.post("/portfolio/analysis", dependencies=[Depends(require_perplexity_key)])
async def analyze_portfolio(portfolio_data: List[Dict[str, Any]] = Body(...)):
    """
    Analyzes a user's portfolio using an improved prompt and response cleaning.
    """
    portfolio_summary = ""
    total_value = sum(item.get('value', 0) for item in portfolio_data)
    for item in portfolio_data:
        percentage = (item.get('value', 0) / total_value * 100) if total_value > 0 else 0
        portfolio_summary += f"- **{item.get('ticker', 'N/A')}**: ${item.get('value', 0):,.0f} ({percentage:.1f}%)\n"

    prompt = f"""
    You are a professional and concise financial analyst. Analyze the following investment portfolio.

    **Portfolio Holdings:**
    {portfolio_summary}
    Total Value: ${total_value:,.0f}

    **Your Task:**
    1.  **Identify Tickers**: For each ticker, perform a quick web search to identify the company and its primary industry. For new or obscure tickers like KRMN (Karman Holdings, a new stock), this is especially important.
    2.  **Provide Analysis**: Write a brief, non-repetitive analysis covering the following points in order. Use clear headings for each section.
        * **Diversification & Concentration**: Assess the portfolio's spread across assets and sectors. Highlight significant concentration risks.
        * **Potential Strengths & Weaknesses**: Identify the strongest aspects and potential vulnerabilities.
        * **Actionable Considerations**: Suggest areas for the user to research further. Frame these as considerations, not direct advice.
    
    **CRITICAL Formatting Rules:**
    - Be direct and concise. Avoid redundant sentences.
    - **Do NOT** include your thought process or any text within `<think>` tags in your final output.
    - Start the analysis directly.
    - End with the mandatory disclaimer: "This AI analysis is for informational purposes only and is not financial advice."
    """

    response_data = await query_perplexity(prompt, PERPLEXITY_ANALYSIS_MODEL, PERPLEXITY_API_KEY)    
    content = response_data["choices"][0]["message"]["content"]
    sources = response_data.get("search_results", [])
    
    if "</think>" in content:
        content = content.split("</think>", 1)[-1].strip()
        
    final_content = _format_and_append_sources(content, sources)
        
    return {"analysis": final_content}



@router.get("/market-report", dependencies=[Depends(require_perplexity_key)])
async def get_market_report():
    prompt = f"""
    Generate a brief, current market report for an investor looking for unique opportunities. Today's date is {date.today().strftime('%B %d, %Y')}.

    1.  **Economic Snapshot**: A short paragraph on the current economic climate.
    2.  **Under-the-Radar Tickers**: Identify 3-4 interesting **small-cap or mid-cap** tickers that are not part of the 'Magnificent Seven' (NVDA, AAPL, MSFT, GOOG, AMZN, META, TSLA). For each, provide:
        * **Company (Ticker)**
        * **Why it's a unique opportunity**: 1-2 sentences explaining its innovative technology, unique market position, or recent catalyst that makes it noteworthy. Focus on companies with strong recent performance or those poised to disrupt an industry.

    **CRITICAL**: End with the disclaimer: "This AI report is for informational purposes only and is not financial advice."
    """
    
    response_data = await query_perplexity(prompt, PERPLEXITY_REPORT_MODEL, PERPLEXITY_API_KEY)
    
    content = response_data["choices"][0]["message"]["content"]
    sources = response_data.get("search_results", [])
    
    final_content = _format_and_append_sources(content, sources)
            
    return {"report": final_content}

@router.get("/status")
async def check_ai_status(
    # This endpoint is protected by BOTH key dependencies.
    # If either key is missing, the corresponding dependency will raise a 412 error.
    apify_key: str = Depends(require_apify_key),
    perplexity_key: str = Depends(require_perplexity_key)
):
    """
    A lightweight endpoint to confirm that all necessary AI API keys are configured on the server.
    Does not make any external API calls.
    """
    return {"enabled": True}

def _format_and_append_sources(content: str, sources: list) -> str:
    """Appends a formatted list of sources to the content if any exist."""
    # This helper function is already correct and needs no changes.
    if not sources:
        return content

    source_links = ["\n\n---", "\n**Sources:**"]
    for i, source in enumerate(sources):
        title = source.get('title', 'Source')
        url = source.get('url')
        if url:
            source_links.append(f"{i+1}. [{title}]({url})")
            
    return content + "\n" + "\n".join(source_links)