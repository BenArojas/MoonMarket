import logging
import re
from fastapi import APIRouter, Depends, HTTPException
import httpx
from app import AppState, get_app_state
from ibkr_auth import check_authentication

# We'll import state differently to avoid circular imports
logger = logging.getLogger(__name__)
router = APIRouter(tags=["Stocks"])


async def subscribe_to_new_holding(symbol, conid, state:AppState):
    """Subscribe to market data for a new holding."""
    if state.ibkr_ws and conid not in state.subscribed_conids:
        try:
            market_data_subscription = f'smd+{conid}+{{"fields":["31","84","86"]}}'
            state.ibkr_ws.send(market_data_subscription)
            state.subscribed_conids.add(conid)
            logger.info(f"Subscribed to market data for new holding {symbol} (conid: {conid})")
        except Exception as e:
            logger.error(f"Error subscribing to new holding {symbol}: {e}")

async def fetch_holdings(state:AppState):
    """Fetch user holdings from IBKR API and subscribe to WebSocket updates."""
    try:
        # Get account ID
        response = await state.client.get(f"{state.config['ibkr_api_url']}/portfolio/accounts", timeout=5)
        response.raise_for_status()
        accounts =  response.json()

        if not accounts:
            logger.error("No accounts found in the response from IBKR.")
            return

        state.account_id = accounts[0]["accountId"]
        logger.info(f"Using Account ID: {state.account_id}")

        # Fetch positions
        response = await state.client.get(f"{state.config['ibkr_api_url']}/portfolio/{state.account_id}/positions", timeout=5)
        response.raise_for_status()
        positions =  response.json()

        old_holdings = set(state.holdings.keys())
        state.holdings.clear()
        
        for position in positions:
            symbol = position.get("contractDesc") 
            conid = position.get("conid")
            avg_bought_price = position.get("avgCost") 
            quantity = position.get("position")

            if symbol and conid and avg_bought_price is not None and quantity is not None:
                state.holdings[symbol] = {
                    "conid": str(conid),
                    "avg_bought_price": float(avg_bought_price),
                    "quantity": float(quantity)
                }
        
        new_holdings = set(state.holdings.keys())
        logger.info(f"Successfully processed and stored holdings for: {list(new_holdings)}")
        
        # Subscribe to WebSocket updates for new holdings
        new_symbols = new_holdings - old_holdings
        if new_symbols and hasattr(state, 'subscribe_to_new_holding'):
            for symbol in new_symbols:
                await subscribe_to_new_holding(symbol, state.holdings[symbol]["conid"], state)

    except httpx.RequestError as e:
        logger.error(f"Error fetching holdings: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred in fetch_holdings: {e}")

@router.get("/holdings")
async def get_holdings(state: AppState = Depends(get_app_state)):
    """Get current holdings."""
    return {"holdings": state.holdings}

@router.get("/account-summary")
async def get_account_summary(state: AppState = Depends(get_app_state)):
    """Get account summary data."""
    return {"account_summary": state.account_summary}

@router.post("/refresh-data")
async def refresh_data(state: AppState = Depends(get_app_state)):
    """Manually refresh holdings and account data."""
    await fetch_holdings(state)
    # Import here to avoid circular imports
    from main import fetch_account_summary
    await fetch_account_summary()
    return {"message": "Data refresh triggered"}

@router.get("/stock/{symbol}")
async def get_stock_data(symbol: str, state: AppState = Depends(get_app_state)):
    """Fetch stock data for a given ticker symbol."""
    try:
        # Search for conid using ticker
        response = await state.client.post(
            f"{state.config['ibkr_api_url']}/iserver/secdef/search",
            json={"symbol": symbol},
            timeout=5
        )
        response.raise_for_status()
        data = await response.json()
        
        if not data or "conid" not in data[0]:
            return {"error": f"No conid found for symbol {symbol}"}
        
        conid = data[0]["conid"]
        company_name = data[0].get("description", symbol)

        # Fetch current market data
        md_response = await state.client.get(
            f"{state.config['ibkr_api_url']}/iserver/marketdata/snapshot",
            params={"conids": conid, "fields": "31,84,86"},  # last price, bid, ask
            timeout=5
        )
        md_response.raise_for_status()
        md_data = await md_response.json()
        
        if md_data and len(md_data) > 0:
            stock_data = md_data[0]
            return {
                "symbol": symbol,
                "company_name": company_name,
                "conid": conid,
                "last_price": float(stock_data.get("31", 0)) if stock_data.get("31") else 0,
                "bid": float(stock_data.get("84", 0)) if stock_data.get("84") else 0,
                "ask": float(stock_data.get("86", 0)) if stock_data.get("86") else 0,
            }
        else:
            return {
                "symbol": symbol,
                "company_name": company_name,
                "conid": conid,
                "last_price": 0,
                "bid": 0,
                "ask": 0,
            }

    except httpx.RequestError as e:
        logger.error(f"Error fetching stock data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching stock data: {str(e)}")

@router.get("/stock/{symbol}/history")
async def get_stock_history(symbol: str, period: str = "1d", bar_size: str = "5mins",  state: AppState = Depends(get_app_state)):
    """
    Fetch historical data for a stock.
    
    Args:
        symbol: Stock ticker symbol
        period: Time period (1d, 1w, 1m, 3m, 6m, 1y, 2y, 5y)
        bar_size: Bar size (1min, 5mins, 15mins, 30mins, 1h, 2h, 3h, 4h, 8h, 1d, 1w, 1m)
    """
    try:
        # First get the conid for the symbol
        search_response = await state.client.post(
            f"{state.config['ibkr_api_url']}/iserver/secdef/search",
            json={"symbol": symbol},
            timeout=5
        )
        search_response.raise_for_status()
        search_data = await search_response.json()
        
        if not search_data or "conid" not in search_data[0]:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        
        conid = search_data[0]["conid"]
        
        # Fetch historical data
        history_response = await state.client.get(
            f"{state.config['ibkr_api_url']}/iserver/marketdata/history",
            params={
                "conid": conid,
                "period": period,
                "bar": bar_size,
                "outsideRth": "false"
            },
            timeout=10
        )
        history_response.raise_for_status()
        history_data = await history_response.json()
        
        # Process the historical data
        if "data" in history_data:
            processed_data = []
            for bar in history_data["data"]:
                processed_data.append({
                    "timestamp": bar.get("t"),  # Unix timestamp
                    "open": bar.get("o"),
                    "high": bar.get("h"),
                    "low": bar.get("l"),
                    "close": bar.get("c"),
                    "volume": bar.get("v", 0)
                })
            
            return {
                "symbol": symbol,
                "conid": conid,
                "period": period,
                "bar_size": bar_size,
                "data": processed_data
            }
        else:
            return {
                "symbol": symbol,
                "conid": conid,
                "period": period,
                "bar_size": bar_size,
                "data": []
            }

    except httpx.RequestError as e:
        logger.error(f"Error fetching historical data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching historical data: {str(e)}")

@router.post("/search")
async def search_stocks(query: dict,  state: AppState = Depends(get_app_state)):
    """
    Search for stocks by symbol or company name.
    
    Body: {"symbol": "AAPL"} or {"name": "Apple"}
    """
    try:
        search_params = {}
        if "symbol" in query:
            search_params["symbol"] = query["symbol"]
        elif "name" in query:
            search_params["name"] = query["name"]
        else:
            raise HTTPException(status_code=400, detail="Must provide either 'symbol' or 'name' in request body")
        
        response = await state.client.post(
            f"{state.config['ibkr_api_url']}/iserver/secdef/search",
            json=search_params,
            timeout=5
        )
        response.raise_for_status()
        data = await response.json()
        
        # Process and return search results
        results = []
        for item in data[:10]:  # Limit to top 10 results
            results.append({
                "symbol": item.get("symbol", ""),
                "company_name": item.get("description", ""),
                "conid": item.get("conid"),
                "exchange": item.get("exchange", ""),
                "currency": item.get("currency", "USD"),
                "instrument_type": item.get("instrument_type", "STK")
            })
        
        return {"results": results}

    except httpx.RequestError as e:
        logger.error(f"Error searching stocks: {e}")
        raise HTTPException(status_code=500, detail=f"Error searching stocks: {str(e)}")

# Legacy function - keeping for compatibility but it's no longer used for live data
async def fetch_market_data():
    """
    Legacy market data polling function.
    This is now replaced by WebSocket subscriptions, but kept for fallback.
    """
    logger.info("fetch_market_data called - but live data now comes via WebSocket")
    pass