import asyncio
from datetime import datetime, timezone
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from models.user import User
from models.stock import Stock
from models.friendRequest import FriendRequest
from models.PortfolioSnapshot import PortfolioSnapshot
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

async def migrate_documents():
    client = None
    try:
        client = await connect_to_mongodb()
        if not client:
            print("Could not establish connection to MongoDB Atlas. Exiting...")
            return

        db = client[CONFIG.DB_NAME]
        
        # Initialize Beanie with all document models
        await init_beanie(
            database=db,
            document_models=[
                User,
                FriendRequest,
                Stock,
                PortfolioSnapshot  # Include PortfolioSnapshot model
            ]
        )


        updated_count = 0
        error_count = 0

        user = await User.get("6701502a7f81ffa5c03b104d")
        snapshots_batch = await PortfolioSnapshot.find(PortfolioSnapshot.userId.id == PydanticObjectId(user.id)).sort(-PortfolioSnapshot.timestamp).to_list()
        
        for snapshot in snapshots_batch:
            try:
                modified = False
                snapshot.cumulativeSpent = 12571.96
                modified = True
                
                # Only save if modifications were made
                if modified:
                    await snapshot.save()
                    updated_count += 1
                    print(f"Progress: {updated_count}snapshots updated", end='\r')
                
            except Exception as e:
                error_count += 1
                print(f"\nError updating snapshot {snapshot.id}: {e}")
                continue

        print(f"\nMigration completed:")
        print(f"- Successfully updated: {updated_count} snapshots")
        print(f"- Errors encountered: {error_count} snapshots")


    except Exception as e:
        print(f"Error during migration: {e}")
        raise
    finally:
        if client:
            print("\nClosing database connection...")
            client.close()

if __name__ == "__main__":
    try:
        asyncio.run(migrate_documents())
    except KeyboardInterrupt:
        print("\nMigration interrupted by user")
    except Exception as e:
        print(f"\nUnexpected error: {e}")