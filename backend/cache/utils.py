from datetime import datetime


def convert_datetime_recursive(obj):
    """Recursively convert datetime objects to ISO format strings in a dictionary or list."""
    if isinstance(obj, dict):
        return {key: convert_datetime_recursive(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetime_recursive(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat() if obj else None
    return obj