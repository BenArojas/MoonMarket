# config.py
import json
from pydantic import BaseModel, Field, HttpUrl, AnyUrl
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class AppConfig(BaseModel):
    ibkr_api_url: HttpUrl = Field("https://localhost:5000/v1/api")
    ibkr_ws_url: AnyUrl = Field("wss://localhost:5000/v1/ws") # AnyUrl for wss
    websocket_port: int = Field(8765, gt=1023, lt=65536)
    http_port: int = Field(8000, gt=1023, lt=65536)
    log_level: str = "INFO"

def load_config(path: str = "config.json") -> AppConfig:
    try:
        with open(path, 'r') as f:
            config_data = json.load(f)
        return AppConfig(**config_data)
    except FileNotFoundError:
        logger.warning(f"Config file not found at {path}. Using default values.")
        return AppConfig()
    except json.JSONDecodeError:
        logger.error(f"Error decoding JSON from config file {path}. Using default values.")
        return AppConfig()
    except Exception as e:
        logger.error(f"Error loading config: {e}. Using default values.")
        return AppConfig()

# Example usage:
# app_config = load_config()