import asyncio
import datetime
from logging import log
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
import httpx
from utils import format_option_description, price_delta, safe_float_conversion
from ibkr import IBKRService
from models import ChartDataBars, ConidResponse, FilteredChainResponse, OptionContract, PositionInfo, QuoteInfo, SearchResult, SingleContractResponse, StaticInfo, StockDetailsResponse
from deps import get_ibkr_service 
from constants import  PERIOD_BAR 
log = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["Market"])

@router.get("/history", response_model=list[ChartDataBars])
async def history(
        conid: int,
        period: str = "1M",
        svc: IBKRService = Depends(get_ibkr_service),
):
    # --- YTD Calculation Logic ---
    if period == "YTD":
        today = datetime.date.today()
        start_of_year = datetime.date(today.year, 1, 1)
        # Calculate number of days for the 'd' period format
        days_since_start = (today - start_of_year).days + 1 
        period_ibkr = f"{days_since_start}d"
        bar_ibkr = "1d"  # Daily bars for YTD
    elif period in PERIOD_BAR:
        period_ibkr, bar_ibkr = PERIOD_BAR[period]
    else:
        raise HTTPException(400, "Invalid period specified")
    try:
        raw = await svc.history(conid, period=period_ibkr, bar=bar_ibkr)
    except httpx.HTTPStatusError as exc:
        log.error("IBKR %s  → %s  %s", exc.request.url, exc.response.status_code, exc.response.text)
        raise HTTPException(exc.response.status_code, "IBKR error")
    except Exception as exc:
        log.exception("unexpected /history error")
        raise HTTPException(500, "internal error")

    return [
        {
            "time": row["t"] // 1000,
            "open": row["o"],
            "high": row["h"],
            "low":  row["l"],
            "close": row["c"],
            "value": row["c"],
            "volume": row["v"],
        }
        for row in raw.get("data", [])
    ]


@router.get("/quote/{conid}")
async def get_stock_quote(conid: int, ibkr_service: IBKRService = Depends(get_ibkr_service)):    
    try:
        if not conid:
            raise HTTPException(status_code=404, detail="Invalid conid.")

        fields_to_fetch = [
            "31",   # Last Price
            "55",   # Ticker Symbol
            "7635", # Mark Price
            "82",   # Change Amount
            "83",   # Change %
            "70",   # High
            "71",   # Low
            "84",   # Bid
            "86",   # Ask
            "7741", # Prior Close
            "7051", # Company Name
            "6509"  # Market Data Availability
        ]

        fields_str = ",".join(fields_to_fetch)
        raw_data = await ibkr_service.snapshot(conids=[conid], fields=fields_str)
        if not raw_data:
            raise HTTPException(status_code=404, detail="No market data available")
        data = raw_data[0]
        
        price_data = price_delta(raw_data)
        # Extract the extra fields we need
        company_name = data.get("7051", "Unknown")
        ticker = data.get("55", "Unknown") 
        bid = safe_float_conversion(raw_data[0].get("84"))
        ask = safe_float_conversion(raw_data[0].get("86"))
        
        return {
        "ticker": ticker,
        "conid": conid,
        "companyName": company_name,
        "bid": bid,
        "ask": ask,
        "lastPrice": price_data.get("last_price"),
        "changePercent": price_data.get("change_percent"),
        "changeAmount": price_data.get("change_amount"),
        "dayHigh": price_data.get("high"),
        "dayLow": price_data.get("low"),
        "previousClose": price_data.get("previous_close"),
        "marketDataStatus": raw_data[0].get("6509_f", "unknown") # Example for status
        }
         
    except Exception as e:
        log.error(e)
        raise HTTPException(status_code=500, detail="Failed to fetch historical stock data.")
    

@router.get("/search", response_model=List[SearchResult])
async def search_securities(
    query: str, 
    svc: IBKRService = Depends(get_ibkr_service)
):
    try:
        raw_results = await svc.search(symbol=query, name=False)
        
        # --- THE FIX IS HERE ---
        # Manually construct the response list to ensure correct mapping.
        formatted_results = []
        for item in raw_results:
            # Skip results that don't even have a conid
            if not item.get('conid') or int(item.get('conid')) == -1:
                continue

            formatted_results.append(
                SearchResult(
                    conid=item.get('conid'),
                    symbol=item.get('symbol'),
                    companyName=item.get('companyHeader'), 
                    secType=item.get('secType')
                )
            )
        return formatted_results
        
    except Exception:
        log.exception("Unexpected /search error")
        return []

@router.get("/options/expirations/{ticker}", response_model=List[str])
async def get_option_expirations(
    ticker: str,
    svc: IBKRService = Depends(get_ibkr_service)
):
    """
    Gets option expiration months by searching for the ticker symbol.
    """
    try:
        # Use the existing search method to find the contract by ticker
        search_results = await svc.search(symbol=ticker,secType="STK")
        if not search_results:
            raise HTTPException(status_code=404, detail=f"No stock contract found for ticker {ticker}")

        # The search can return multiple results; we assume the first is the primary.
        # A more robust solution might filter by exchange if needed.
        metadata = search_results[0]
        
        if not metadata.get('sections'):
            raise HTTPException(status_code=404, detail="Contract found, but no 'sections' data was available.")

        opt_section = next((s for s in metadata['sections'] if s.get('secType') == 'OPT'), None)
        if not opt_section or not opt_section.get('months'):
            raise HTTPException(status_code=404, detail="No option expiration months found.")

        months = opt_section['months'].split(';')
        return [m for m in months if m]
    except Exception as e:
        log.error(e)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/options/chain/{ticker}", response_model=FilteredChainResponse)
async def get_filtered_option_chain(
    ticker: str,
    expiration_month: str,
    strike_count: int = 4, # Number of strikes to fetch on each side of the price
    svc: IBKRService = Depends(get_ibkr_service)
):
    # --- Step 1: Get Underlying ConID & Price ---
    search_results = await svc.search(symbol=ticker, secType="STK")
    underlying_conid = search_results[0].get("conid")
    
    price_snapshot = await svc.snapshot(conids=[underlying_conid], fields="31")
    # Check if the snapshot was successful after its internal polling
    if not (price_snapshot and "31" in price_snapshot[0]):
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch a valid market price for {ticker}."
        )

    current_price = float(price_snapshot[0]["31"])

    # --- Step 2: Get All Potential Strikes ---
    all_strikes_data = await svc.get_strikes_for_month(underlying_conid, expiration_month)
    all_strikes = sorted([float(s) for s in all_strikes_data.get("put", [])])
    if not all_strikes:
        raise HTTPException(status_code=404, detail="No strikes found for this expiration.")

    # --- Step 3: Filter the Strikes ---
    # Find the index of the strike closest to the current price
    closest_strike_index = min(range(len(all_strikes)), key=lambda i: abs(all_strikes[i] - current_price))
    start_index = max(0, closest_strike_index - strike_count)
    end_index = min(len(all_strikes), closest_strike_index + strike_count)
    filtered_strikes = all_strikes[start_index:end_index]

    # --- Step 4: Validate Filtered Strikes Concurrently ---
    tasks = []
    for strike in filtered_strikes:
        tasks.append(svc.get_contract_info(underlying_conid, expiration_month, strike, "C"))
        tasks.append(svc.get_contract_info(underlying_conid, expiration_month, strike, "P"))
    
    validated_contracts_responses = await asyncio.gather(*tasks)
    
    # --- Step 5 & 6: Get Bulk Market Data ---
    valid_conids = [
        contract["conid"]
        for response in validated_contracts_responses
        if response and isinstance(response, list) and len(response) > 0 and (contract := response[0])
    ]

    market_data_snapshot = await svc.snapshot(valid_conids, fields="31,84,86,7069,13,70,71")
    market_data_map = {str(item['conid']): item for item in market_data_snapshot}

    # --- Step 7: Reshape Data for Frontend ---
    final_chain = {}
    for response in validated_contracts_responses:
        if response and isinstance(response, list) and len(response) > 0 and (contract := response[0]):
            strike_key = f"{float(contract['strike']):.2f}"
            if strike_key not in final_chain:
                final_chain[strike_key] = {"call": None, "put": None}
            
            contract_type = "call" if contract['right'] == "C" else "put"
            market_data = market_data_map.get(str(contract['conid']), {})
            
            final_chain[strike_key][contract_type] = OptionContract(
                contractId=contract['conid'],
                strike=float(strike_key),
                type=contract_type,
                lastPrice=safe_float_conversion(market_data.get('31')),
                bid=safe_float_conversion(market_data.get('84')),
                ask=safe_float_conversion(market_data.get('86')),
                volume=safe_float_conversion(market_data.get('7069')),
                delta=safe_float_conversion(market_data.get('13')),
                bidSize=safe_float_conversion(market_data.get('70')),
                askSize=safe_float_conversion(market_data.get('71')),
            )

    return FilteredChainResponse(all_strikes=all_strikes, chain=final_chain)

@router.get("/options/contract/{ticker}", response_model=SingleContractResponse)
async def get_single_option_contract(
    ticker: str,
    expiration_month: str,
    strike: float,
    svc: IBKRService = Depends(get_ibkr_service)
):
    """
    Gets the validated Call and Put contracts for a single strike price
    and enriches them with live market data.
    """
    try:
        # Step 1: Get underlying conId
        search_results = await svc.search(symbol=ticker, secType="STK")
        if not search_results:
            raise HTTPException(status_code=404, detail=f"No stock contract found for {ticker}")
        underlying_conid = search_results[0].get("conid")

        # Step 2: Validate Call and Put contracts concurrently
        call_task = svc.get_contract_info(underlying_conid, expiration_month, strike, "C")
        put_task = svc.get_contract_info(underlying_conid, expiration_month, strike, "P")
        call_info_list, put_info_list = await asyncio.gather(call_task, put_task)

        # Step 3: Collect valid conIds to fetch market data
        conids_to_price = []
        call_contract_info = call_info_list[0] if call_info_list else None
        put_contract_info = put_info_list[0] if put_info_list else None

        if call_contract_info:
            conids_to_price.append(call_contract_info['conid'])
        if put_contract_info:
            conids_to_price.append(put_contract_info['conid'])

        if not conids_to_price:
            # If no valid contracts found, return empty data
            return SingleContractResponse(strike=strike, data={"call": None, "put": None})

        # Step 4: Get market data snapshot for the valid conIds
        market_data_snapshot = await svc.snapshot(conids_to_price, fields="31,84,86,7069,13,70,71")
        market_data_map = {str(item['conid']): item for item in market_data_snapshot}

        # Step 5: Build the final response object
        call_to_add: Optional[OptionContract] = None
        put_to_add: Optional[OptionContract] = None

        if call_contract_info:
            conid = str(call_contract_info['conid'])
            market_data = market_data_map.get(conid, {})
            
            call_to_add = OptionContract(
                contractId=int(conid), strike=strike, type='call',
                lastPrice=safe_float_conversion(market_data.get('31')),
                bid=safe_float_conversion(market_data.get('84')),
                ask=safe_float_conversion(market_data.get('86')),
                volume=safe_float_conversion(market_data.get('7069')),
                delta=safe_float_conversion(market_data.get('13')),
                bidSize=safe_float_conversion(market_data.get('70')),
                askSize=safe_float_conversion(market_data.get('71')),
            )

        if put_contract_info:
            conid = str(put_contract_info['conid'])
            market_data = market_data_map.get(conid, {})
            put_to_add = OptionContract(
                contractId=int(conid), strike=strike, type='put',
                lastPrice=safe_float_conversion(market_data.get('31')),
                bid=safe_float_conversion(market_data.get('84')),
                ask=safe_float_conversion(market_data.get('86')),
                volume=safe_float_conversion(market_data.get('7069')),
                delta=safe_float_conversion(market_data.get('13')),
                bidSize=safe_float_conversion(market_data.get('70')),
                askSize=safe_float_conversion(market_data.get('71')),
            )
        
        # Explicitly create the nested data structure for the response model
        response_data = {"call": call_to_add, "put": put_to_add}
        return SingleContractResponse(strike=strike, data=response_data)

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.get("/conid/{ticker}", response_model=ConidResponse)
async def get_conid_for_ticker(
    ticker: str, 
    svc: IBKRService = Depends(get_ibkr_service)
):
    """
    Finds the most likely conid for a given ticker symbol.
    """
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker symbol is required.")
    try:
        # Use the existing search service
        results = await svc.search(symbol=ticker, name=False)        
        for item in results:
            if item.get('conid'):
                return {
                    "conid": int(item.get('conid')),
                    "companyName": item.get('companyHeader', ticker)
                }
        
        # If no STK is found, return the first valid result of any type
        for item in results:
             if item.get('conid'):
                  return {
                    "conid": int(item.get('conid')),
                    "companyName": item.get('companyHeader', ticker)
                }

        raise HTTPException(status_code=404, detail=f"No valid contract found for ticker {ticker}")

    except Exception:
        log.exception(f"Error finding conid for {ticker}")
        raise HTTPException(status_code=500, detail="Failed to resolve ticker to conid.")

@router.get("/stock/{conid}/details", response_model=StockDetailsResponse)
async def get_stock_details(
    conid: int,
    accountId: str,
    svc: IBKRService = Depends(get_ibkr_service)
):
    """
    Fetches a bundle of data for the StockItem page:
    1. Static contract information (name, ticker).
    2. A current quote snapshot.
    3. The user's position details, if the instrument is held.
    """
    try:
        # --- Task 1: Fetch Static Info & Quote from IBKR ---
        # A list of relevant IBKR field codes
        fields_to_fetch = ["55", "7051", "6004", "6119", "6070", "31", "84", "86", "83", "82", "70", "71"]
        fields_str = ",".join(fields_to_fetch)
        
        # We expect a list with one item for our single conid
        snapshot_data = await svc.snapshot(conids=[conid], fields=fields_str)
        if not snapshot_data:
            raise HTTPException(status_code=404, detail="Instrument not found or no market data available.")
        
        data = snapshot_data[0]
        ticker = data.get("55")
        if not ticker:
            raise HTTPException(status_code=404, detail="Could not resolve ticker symbol for the instrument.")

        positions_data = await svc.get_related_positions(accountId, conid, ticker)
        

        # --- Task 3: Assemble the Response ---
        static_info = StaticInfo(
            conid=conid,
            ticker=ticker,
            companyName=data.get("7051", "Unknown Company"),
            exchange=data.get("6004"),
            secType=data.get("6119"),
            currency=data.get("6070"),
        )
        
        quote_info = QuoteInfo(
            lastPrice=safe_float_conversion(data.get("31")),
            bid=safe_float_conversion(data.get("84")),
            ask=safe_float_conversion(data.get("86")),
            changePercent=safe_float_conversion(data.get("83")),
            changeAmount=safe_float_conversion(data.get("82")),
            dayHigh=safe_float_conversion(data.get("70")),
            dayLow=safe_float_conversion(data.get("71")),
        )

        stock_pos_dict = positions_data["stock"]
        if stock_pos_dict:
            # This part is fine, as 'name' is being added, not replaced.
            stock_pos_dict['name'] = static_info.companyName

        stock_pos_model = PositionInfo(**stock_pos_dict) if stock_pos_dict else None

        # 2. For option positions, create the models in a more controlled way.
        option_pos_models = []
        if positions_data["options"]:
            for pos in positions_data["options"]:
                # Create a copy so we don't alter the original data
                pos_data = pos.copy()
                
                # Safely remove the original 'name' key to prevent the conflict.
                # It might not exist, so we provide a default `None` to pop.
                pos_data.pop('name', None)

                # Now create the model with the formatted name and the rest of the data.
                model = PositionInfo(
                    name=format_option_description(pos.get("contractDesc", "")),
                    **pos_data
                )
                option_pos_models.append(model)
        
        # If the list is empty after the loop, set it to None.
        if not option_pos_models:
            option_pos_models = None

        return StockDetailsResponse(
            staticInfo=static_info,
            quote=quote_info,
            positionInfo=stock_pos_model,
            optionPositions=option_pos_models,
        )

    except HTTPException as e:
        raise e # Re-throw known HTTP exceptions
    except Exception as e:
        log.exception(f"Failed to get stock details for conid {conid}: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred.")