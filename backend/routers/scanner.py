from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from ibkr_service import IBKRService
from deps import get_ibkr_service

log = logging.getLogger(__name__)

router = APIRouter(prefix="/scanner", tags=["scanner"])

# Pydantic models for request/response validation
class ScannerFilter(BaseModel):
    code: str
    value: float

class ScannerRequest(BaseModel):
    instrument: str
    type: str
    location: str
    filter: Optional[List[ScannerFilter]] = []

class ScannerResponse(BaseModel):
    contracts: List[Dict[str, Any]]
    scan_data_column_name: Optional[str] = None

class ScannerParamsResponse(BaseModel):
    scan_type_list: List[Dict[str, Any]]
    instrument_list: List[Dict[str, Any]]
    filter_list: List[Dict[str, Any]]
    location_tree: List[Dict[str, Any]]



@router.get("/params", response_model=ScannerParamsResponse)
async def get_scanner_parameters(ibkr_service : IBKRService = Depends(get_ibkr_service)):
    """
    Get all available scanner parameters including scan types, instruments, 
    filters, and locations.
    """
    try:
        log.info("Fetching scanner parameters...")
        params = await ibkr_service.get_scanner_params()
        return ScannerParamsResponse(**params)
    except Exception as e:
        log.error(f"Error fetching scanner parameters: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scanner parameters")

@router.post("/run", response_model=ScannerResponse)
async def run_market_scanner(
    scanner_request: ScannerRequest,
    ibkr_service : IBKRService = Depends(get_ibkr_service)
):
    """
    Run a market scanner with the specified parameters.
    Returns up to 50 contracts matching the criteria.
    """
    try:
        log.info(f"Running scanner with params: {scanner_request.dict()}")
        
        # Convert pydantic model to dict for IBKR API
        # scanner_payload = {
        #     "instrument": scanner_request.instrument,
        #     "type": scanner_request.type,
        #     "location": scanner_request.location,
        #     "filter": [{"code": f.code, "value": f.value} for f in scanner_request.filter]
        # }
        scanner_payload = scanner_request.model_dump(exclude_unset=True)
        
        result = await ibkr_service.run_scanner(scanner_payload)
        return ScannerResponse(**result)
        
    except Exception as e:
        log.error(f"Error running scanner: {e}")
        raise HTTPException(status_code=500, detail="Failed to run market scanner")

@router.get("/instruments/{instrument_type}")
async def get_instrument_filters(
    instrument_type: str,
    ibkr_service : IBKRService = Depends(get_ibkr_service)
):
    """
    Get available filters for a specific instrument type.
    """
    try:
        params = await ibkr_service.get_scanner_params()
        
        # Find the instrument and return its filters
        for instrument in params.get("instrument_list", []):
            if instrument.get("type") == instrument_type:
                return {"filters": instrument.get("filters", [])}
        
        return {"filters": []}
        
    except Exception as e:
        log.error(f"Error fetching instrument filters: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch instrument filters")

@router.get("/scan-types/{instrument_type}")
async def get_scan_types_for_instrument(
    instrument_type: str,
    ibkr_service : IBKRService = Depends(get_ibkr_service)
):
    """
    Get available scan types for a specific instrument.
    """
    try:
        params = await ibkr_service.get_scanner_params()
        
        # Find scan types that support this instrument
        compatible_scan_types = []
        for scan_type in params.get("scan_type_list", []):
            if instrument_type in scan_type.get("instruments", []):
                compatible_scan_types.append(scan_type)
        
        return {"scan_types": compatible_scan_types}
        
    except Exception as e:
        log.error(f"Error fetching scan types: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scan types")

