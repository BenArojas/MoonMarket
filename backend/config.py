from pydantic_settings import BaseSettings
from decouple import config

    
class DatabaseSettings(BaseSettings):
    DB_URL: str = config("DB_URL")
    DB_NAME: str = config("DB_NAME")

    
class Settings(DatabaseSettings):
    pass

# Instantiate Settings
CONFIG = Settings()
