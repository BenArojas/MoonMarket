from pydantic_settings import BaseSettings
from decouple import config

class CommonSettings(BaseSettings):
    APP_NAME: str = "MOON MARKET"
    DEBUG_MODE: bool = False

class ServerSettings(BaseSettings):
    HOST: str = "localhost"
    PORT: int = 8000
    
class DatabaseSettings(BaseSettings):
    DB_URL: str = config("DB_URL")
    DB_NAME: str = config("DB_NAME")

# Security settings
class SecuritySettings(BaseSettings):
    authjwt_secret_key: str = config("JWT_SECRET_KEY")
    salt: bytes = config("SALT").encode()
    
class Settings(CommonSettings, ServerSettings, DatabaseSettings, SecuritySettings):
    pass

# Instantiate Settings
CONFIG = Settings()




    # # FastMail SMTP server settings
    # mail_console: bool = config("MAIL_CONSOLE", default=False, cast=bool)
    # mail_server: str = config("MAIL_SERVER", default="smtp.myserver.io")
    # mail_port: int = config("MAIL_PORT", default=587, cast=int)
    # mail_username: str = config("MAIL_USERNAME", default="")
    # mail_password: str = config("MAIL_PASSWORD", default="")
    # mail_sender: str = config("MAIL_SENDER", default="noreply@myserver.io")

    # testing: bool = config("TESTING", default=False, cast=bool)
