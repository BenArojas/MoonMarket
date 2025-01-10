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

        # Convert string ID to PydanticObjectId
        user_id = PydanticObjectId("6701502a7f81ffa5c03b104d")
        
        updated_count = 0
        error_count = 0
        transactions = await Transaction.find(Transaction.user_id.id == user_id).to_list()
        # Find all transactions for the specific user using the correct query syntax
        for transaction in transactions:
            try:
                transaction.commission = 8.0
                await transaction.save()
                updated_count += 1
                print(f"Progress: {updated_count} transactions updated", end='\r')
            except Exception as e:
                error_count += 1
                print(f"\nError updating transaction {transaction.id}: {e}")
                continue

        print(f"\nMigration completed:")
        print(f"- Successfully updated: {updated_count} transactions")
        print(f"- Errors encountered: {error_count} transactions")

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