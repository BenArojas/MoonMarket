import asyncio
from datetime import datetime, timezone
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from models.user import User
from models.stock import Stock
from models.friendRequest import FriendRequest
from config import CONFIG

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
        # Important: FriendRequest must be initialized because User has Link references to it
        await init_beanie(
            database=db,
            document_models=[
                User,
                FriendRequest,
                Stock
            ]
        )

        # Get total count for progress tracking
        total_users = await User.count()
        if total_users == 0:
            print("No users found in the database")
            return

        print(f"Found {total_users} users to update")
        updated_count = 0
        error_count = 0

        # Process users in batches to avoid memory issues
        batch_size = 50
        for skip in range(0, total_users, batch_size):
            users_batch = await User.find_all().skip(skip).limit(batch_size).to_list()
            
            for user in users_batch:
                try:
                    modified = False
                    
                    # Add session field if it doesn't exist
                    if not hasattr(user, 'session'):
                        user.session = None
                        modified = True
                    
                    # Add last_activity field if it doesn't exist
                    if not hasattr(user, 'last_activity'):
                        user.last_activity = None
                        modified = True
                    
                    # Only save if modifications were made
                    if modified:
                        await user.save()
                        updated_count += 1
                        print(f"Progress: {updated_count}/{total_users} users updated", end='\r')
                    
                except Exception as e:
                    error_count += 1
                    print(f"\nError updating user {user.email}: {e}")
                    continue

        print(f"\nMigration completed:")
        print(f"- Successfully updated: {updated_count} users")
        print(f"- Errors encountered: {error_count} users")
        print(f"- Total processed: {total_users} users")

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