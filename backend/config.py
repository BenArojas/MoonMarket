import os
from dotenv import load_dotenv

load_dotenv()

APIFY_API_KEY = os.getenv("APIFY_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
# Load Perplexity model names from environment with defaults
PERPLEXITY_ANALYSIS_MODEL = os.getenv("PERPLEXITY_ANALYSIS_MODEL", "sonar-reasoning-pro")
PERPLEXITY_REPORT_MODEL = os.getenv("PERPLEXITY_REPORT_MODEL", "sonar-pro")
GATEWAY_BASE_URL = os.getenv("IBKR_GATEWAY_URL", "https://ibkr-gateway:5000")
REDIS_URL =  os.getenv("REDIS_URL")
REDIS_PASSWORD =  os.getenv("REDIS_PASSWORD")
