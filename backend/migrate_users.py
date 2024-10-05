import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from models.user import User
from models.friendRequest import FriendRequest
from config import CONFIG  # Assuming you have a config file with DB_URL

async def migrate_users():
    # Initialize database connection
    client = AsyncIOMotorClient(CONFIG.DB_URL)
    db = client.stock_db  # Replace with your actual database name

    # Initialize Beanie with all your document models
    await init_beanie(database=db, document_models=[User, FriendRequest])

    # Fetch all users
    users = await User.find_all().to_list()

    for user in users:
        # Check if the new fields don't exist and add them
        if not hasattr(user, 'profit'):
            user.profit = 0

        # Save the updated user
        await user.save()

    print(f"Updated {len(users)} users")

# Run the migration
if __name__ == "__main__":
    asyncio.run(migrate_users())