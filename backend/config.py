from pydantic_settings import BaseSettings
from decouple import config

    
class DatabaseSettings(BaseSettings):
    DB_URL: str = config("DB_URL")
    DB_NAME: str = config("DB_NAME")

# Security settings
class SecuritySettings(BaseSettings):
    authjwt_secret_key: str = config("JWT_SECRET_KEY")
    salt: bytes = config("SALT").encode()
    
class Settings(DatabaseSettings, SecuritySettings):
    pass

# Instantiate Settings
CONFIG = Settings()
