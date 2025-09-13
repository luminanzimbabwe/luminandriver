# myapp/token_utils.py
import uuid
from datetime import datetime, timedelta
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["luminanDB"]  # your database name
tokens_collection = db["auth_tokens"]

# Token lifetimes
ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)  # access tokens last 15 mins
REFRESH_TOKEN_LIFETIME = timedelta(days=7)     # refresh tokens last 7 days

def generate_tokens(user_id):
    """Generate a new pair of access and refresh tokens for a user."""
    access_token = str(uuid.uuid4())
    refresh_token = str(uuid.uuid4())

    # Save tokens in MongoDB
    tokens_collection.insert_one({
        "user_id": user_id,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "access_expires": datetime.now() + ACCESS_TOKEN_LIFETIME,
        "refresh_expires": datetime.now() + REFRESH_TOKEN_LIFETIME,
    })

    # Return the tokens
    return {"access": access_token, "refresh": refresh_token}


def authenticate_access_token(access_token):
    """
    Check if the access token is valid and not expired.
    Returns the user_id if valid, None otherwise.
    """
    record = tokens_collection.find_one({"access_token": access_token})
    if record and record["access_expires"] > datetime.now():
        return record["user_id"]
    return None


def refresh_access_token(refresh_token):
    """
    Refresh the access token using a valid refresh token.
    Returns a new access token dict if successful, None otherwise.
    """
    record = tokens_collection.find_one({"refresh_token": refresh_token})
    if record and record["refresh_expires"] > datetime.now():
        new_access_token = str(uuid.uuid4())
        tokens_collection.update_one(
            {"refresh_token": refresh_token},
            {"$set": {
                "access_token": new_access_token,
                "access_expires": datetime.now() + ACCESS_TOKEN_LIFETIME
            }}
        )
        return {"access": new_access_token}
    return None
