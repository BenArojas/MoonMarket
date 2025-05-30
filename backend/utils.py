# utils.py
import logging
import sys

def setup_logging(level="INFO"):
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    # You might want to suppress verbose logs from libraries if needed
    # logging.getLogger("websockets").setLevel(logging.WARNING)
    # logging.getLogger("httpx").setLevel(logging.WARNING)