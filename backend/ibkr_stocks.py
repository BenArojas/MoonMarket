import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException, Depends
import requests
from ibkr_auth import check_authentication
from main import state

config = state.config

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Stocks"])



async def fetch_holdings():
    """Fetch user holdings from IBKR API."""
    if not check_authentication():
        logger.warning("Not authenticated, skipping holdings fetch.")
        return
    try:
        # Get account ID
        response = state.session.get(f"{config['ibkr_api_url']}/portfolio/accounts", timeout=5)
        response.raise_for_status()
        accounts = response.json()

        if not accounts:
            logger.error("No accounts found in the response from IBKR.")
            return

        account_id = accounts[0]["accountId"]
        logger.info(f"Using Account ID: {account_id}")

        # Fetch positions
        response = state.session.get(f"{config['ibkr_api_url']}/portfolio/{account_id}/positions", timeout=5)
        response.raise_for_status()
        positions = response.json()

        state.holdings.clear()
        for position in positions:
            # --- FIX #1: Get the ticker from 'contractDesc' ---
            symbol = position.get("contractDesc") 
            conid = position.get("conid")
            # --- FIX #2: Use the actual 'avgCost' for the bought price ---
            avg_bought_price = position.get("avgCost") 
            quantity = position.get("position")

            if symbol and conid and avg_bought_price is not None and quantity is not None:
                state.holdings[symbol] = {
                    "conid": str(conid),
                    "avg_bought_price": float(avg_bought_price),
                    "quantity": float(quantity)
                }
        
        # This log should now show your tickers!
        logger.info(f"Successfully processed and stored holdings for: {list(state.holdings.keys())}")

    except requests.RequestException as e:
        logger.error(f"Error fetching holdings: {e}")
    except Exception as e:
        logger.error(f"An unexpected error occurred in fetch_holdings: {e}")

async def fetch_market_data():
    """Poll market data for holdings and stream to clients."""
    while True:
        await asyncio.sleep(5) # Delay first
        if not state.holdings or not state.clients:
            continue
        try:
            conids = ",".join(holding["conid"] for holding in state.holdings.values())
            response = state.session.get(
                f"{config['ibkr_api_url']}/iserver/marketdata/snapshot",
                params={"conids": conids, "fields": "31"},  # last price
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                
                # --- START OF MODIFIED BLOCK ---
                
                # We create one large message list to send, which is more efficient
                messages_to_send = []

                for item in data:
                    price_str = item.get("31") # Get the price string
                    if not price_str:
                        continue # Skip if there's no price field

                    cleaned_price = 0.0
                    try:
                        # First, try to convert directly
                        cleaned_price = float(price_str)
                    except (ValueError, TypeError):
                        # If it fails, clean the string and try again
                        match = re.search(r'[\d.]+', str(price_str))
                        if match:
                            cleaned_price = float(match.group(0))
                        else:
                            logger.warning(f"Could not parse price from malformed string: {price_str}")
                            continue # Skip this item if we can't parse it

                    symbol = next((s for s, h in state.holdings.items() if h["conid"] == str(item.get("conid"))), None)
                    if symbol:
                        holding = state.holdings[symbol]
                        # Calculate current values
                        current_value = cleaned_price * holding["quantity"]
                        unrealized_pnl = (cleaned_price - holding["avg_bought_price"]) * holding["quantity"]
                        message = {
                            "type": "market_data",
                            "symbol": symbol,
                            "last_price": cleaned_price,
                            "avg_bought_price": state.holdings[symbol]["avg_bought_price"],
                            "quantity": state.holdings[symbol]["quantity"],
                            "value": current_value,
                            "unrealized_pnl": unrealized_pnl,
                        }
                        messages_to_send.append(json.dumps(message))

                if messages_to_send and state.clients:
                    # Create tasks to send all messages concurrently to all clients
                    tasks = [client.send(msg) for msg in messages_to_send for client in state.clients]
                    await asyncio.gather(*tasks)
                    logger.info(f"Sent {len(messages_to_send)} market data updates to {len(state.clients)} client(s).")

                # --- END OF MODIFIED BLOCK ---

            else:
                logger.error(f"Market data fetch failed: {response.status_code} - {response.text}")
        except requests.RequestException as e:
            logger.error(f"Error fetching market data: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred in fetch_market_data: {e}")

@router.get("/stock/{symbol}")
async def get_stock_data(symbol: str):
    """Fetch stock data for a given ticker symbol."""
    try:
        # Search for conid using ticker
        response = state.session.post(
            f"{config['ibkr_api_url']}/iserver/secdef/search",
            json={"symbol": symbol},
            timeout=5
        )
        response.raise_for_status() # Raise an exception for bad status codes
        data = response.json()
        if not data or "conid" not in data[0]:
            return {"error": f"No conid found for symbol {symbol}"}
        conid = data[0]["conid"]

        # Fetch market data
        md_response = state.session.get(
            f"{config['ibkr_api_url']}/iserver/marketdata/snapshot",
            params={"conids": conid, "fields": "31"},  # last price
            timeout=5
        )
        md_response.raise_for_status()
        md_data = md_response.json()
        return {"symbol": symbol, "last_price": float(md_data[0].get("31", 0)) if md_data else 0}

    except requests.RequestException as e:
        logger.error(f"Error fetching stock data for {symbol}: {e}")
        return {"error": str(e)}