import asyncio
from datetime import datetime, timezone
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from models.user import User
from models.stock import Stock
from models.friendRequest import FriendRequest
from models.PortfolioSnapshot import PortfolioSnapshot
from models.transaction import Transaction
from config import CONFIG
from beanie import PydanticObjectId


async def connect_to_mongodb():
    try:
        client = AsyncIOMotorClient(
            CONFIG.DB_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000
        )
        await client.admin.command('ping')
        print("Successfully connected to MongoDB Atlas!")
        return client
    except Exception as e:
        print(f"Failed to connect to MongoDB Atlas: {e}")
        return None

async def migrate_transactions():
    client = None
    try:
        client = await connect_to_mongodb()
        if not client:
            print("Could not establish connection to MongoDB Atlas. Exiting...")
            return

        db = client[CONFIG.DB_NAME]
        await init_beanie(
            database=db,
            document_models=[User, FriendRequest, Stock, PortfolioSnapshot, Transaction]
        )

        users = await User.find_all().to_list()
        # Find all transactions for the specific user using the correct query syntax
        for user in users:
           user.account_type = "free"
           await user.save()

    except Exception as e:
        print(f"Error during migration: {e}")
        raise
    finally:
        if client:
            print("\nClosing database connection...")
            client.close()

if __name__ == "__main__":
    try:
        asyncio.run(migrate_transactions())
    except KeyboardInterrupt:
        print("\nMigration interrupted by user")
    except Exception as e:
        print(f"\nUnexpected error: {e}")