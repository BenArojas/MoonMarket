from datetime import timedelta
from pydantic_settings import BaseSettings
from decouple import config

    
class DatabaseSettings(BaseSettings):
    DB_URL: str = config("DB_URL")
    DB_NAME: str = config("DB_NAME")
    
class RedisSettings(BaseSettings):
    REDIS_URL: str = config("REDIS_URL")

    
class Settings(DatabaseSettings, RedisSettings):
    pass

# Instantiate Settings
CONFIG = Settings()

EXPIRATION_TIME = timedelta(minutes = 15)  # 15 minutes
COOKIE_SECURE = True  # Set to True in production
