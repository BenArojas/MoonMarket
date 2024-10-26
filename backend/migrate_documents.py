import asyncio
from datetime import datetime, timezone
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from models.user import User
from models.stock import Stock
from models.friendRequest import FriendRequest
from config import CONFIG  # Assuming you have a config file with DB_URL

async def migrate_documents():
    try:
        # Initialize database connection
        client = AsyncIOMotorClient(CONFIG.DB_URL)
        db = client.stock_db  # Replace with your actual database name

        # Initialize Beanie with all your document models
        await init_beanie(database=db, document_models=[Stock])

        # Fetch all users
        stocks = await Stock.find_all().to_list()

        for stock in stocks:
            # Check if the new fields don't exist and add them
            if not hasattr(stock, 'last_updated'):
                stock.last_updated = datetime.now(timezone.utc)

            # Save the updated user
            await stock.save()

        print(f"Updated {len(stocks)} users")
    finally:
        # Close the database connection
        client.close()

# Run the migration
if __name__ == "__main__":
    asyncio.run(migrate_documents())