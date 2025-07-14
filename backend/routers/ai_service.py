from datetime import date
import httpx
from fastapi import APIRouter, HTTPException, Depends, Body
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import List, Dict, Any

# Assuming your config file is at the root of your backend source
from .. import config

# Initialize router and sentiment analyzer
router = APIRouter(prefix="/ai", tags=["AI Services"])
analyzer = SentimentIntensityAnalyzer()

# --- API KEY DEPENDENCIES ---

def require_apify_key():
    """Dependency to ensure Apify API key is set."""
    if not config.APIFY_API_KEY:
        raise HTTPException(status_code=412, detail="Apify API key is not configured on the server.")
    return config.APIFY_API_KEY

def require_perplexity_key():
    """Dependency to ensure Perplexity API key is set."""
    if not config.PERPLEXITY_API_KEY:
        raise HTTPException(status_code=412, detail="Perplexity API key is not configured on the server.")
    return config.PERPLEXITY_API_KEY


# --- TWITTER SENTIMENT ENDPOINT ---

@router.get("/stock/{ticker}/sentiment", dependencies=[Depends(require_apify_key)])
async def get_stock_sentiment(ticker: str):
    """
    Scrapes recent tweets for a stock ticker and returns an aggregated sentiment score.
    Searches for cashtags (e.g., $TSLA) and filters out retweets.
    """
    search_query = f"${ticker} -is:retweet"
    apify_api_url = f"https://api.apify.com/v2/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/run-sync-get-dataset-items?token={config.APIFY_API_KEY}"

    payload = {"twitterContent": search_query, "maxItems": 100, "lang": "en"}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(apify_api_url, json=payload)
            response.raise_for_status()
        tweets = response.json()

        if not tweets or not any('text' in t for t in tweets):
            return {"sentiment": "neutral", "score": 0, "tweets_analyzed": 0}

        # Perform and aggregate sentiment analysis
        compound_scores = [analyzer.polarity_scores(tweet['text'])['compound'] for tweet in tweets if 'text' in tweet]
        avg_score = sum(compound_scores) / len(compound_scores)

        if avg_score >= 0.05:
            sentiment = "positive"
        elif avg_score <= -0.05:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        return {"sentiment": sentiment, "score": round(avg_score, 3), "tweets_analyzed": len(compound_scores)}

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
        
        data = response.json()
        # The answer is located in the 'content' of the first message in the 'choices' array
        return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        print(f"Perplexity API Error: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail="An error occurred with the Perplexity API.")
    except (KeyError, IndexError) as e:
        print(f"Error parsing Perplexity response: {e}")
        raise HTTPException(status_code=500, detail="Invalid response format from Perplexity.")

@router.post("/portfolio/analysis", dependencies=[Depends(require_perplexity_key)])
async def analyze_portfolio(portfolio_data: List[Dict[str, Any]] = Body(...)):
    """
    Analyzes a user's portfolio using the model specified in the .env file.
    """
    # ... (code to build the prompt remains the same)
    portfolio_summary = ""
    total_value = sum(item.get('value', 0) for item in portfolio_data)
    for item in portfolio_data:
        percentage = (item.get('value', 0) / total_value * 100) if total_value > 0 else 0
        portfolio_summary += f"- **{item.get('ticker', 'N/A')}**: ${item.get('value', 0):,.0f} ({percentage:.1f}%)\n"

    prompt = f"""
    Analyze this investment portfolio:
    {portfolio_summary}
    Total Value: ${total_value:,.0f}

    Provide a brief analysis covering:
    1.  **Diversification & Concentration**: Assess the portfolio's spread across assets. Highlight any significant concentration risks.
    2.  **Potential Strengths & Weaknesses**: Identify the strongest aspects and potential vulnerabilities.
    3.  **Actionable Considerations**: Suggest areas for the user to research further (e.g., "Consider exploring technology sector ETFs to balance the heavy industrial exposure.").

    **CRITICAL**: End with the disclaimer: "This AI analysis is for informational purposes only and is not financial advice."
    """
    # Use the configurable model from config.py for analysis
    analysis = await query_perplexity(prompt, config.PERPLEXITY_ANALYSIS_MODEL, config.PERPLEXITY_API_KEY)
    return {"analysis": analysis}


@router.get("/market-report", dependencies=[Depends(require_perplexity_key)])
async def get_market_report():
    """
    Generates a market report using the model specified in the .env file.
    """
    # ... (code to build the prompt remains the same)
    prompt = f"""
    Generate a brief, current market report for an investor. Today's date is {date.today().strftime('%B %d, %Y')}.

    1.  **Economic Snapshot**: A short paragraph on the current economic climate (e.g., inflation, interest rates, market sentiment).
    2.  **Tickers in Focus**: Identify 3 interesting tickers. For each, provide:
        * **Company (Ticker)**
        * **Why it's interesting**: 1-2 sentences on recent news, tech, or market position.

    **CRITICAL**: End with the disclaimer: "This AI report is for informational purposes only and is not financial advice."
    """
    # Use the configurable model from config.py for the report
    report = await query_perplexity(prompt, config.PERPLEXITY_REPORT_MODEL, config.PERPLEXITY_API_KEY)
    return {"report": report}