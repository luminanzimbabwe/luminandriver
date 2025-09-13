from pymongo import MongoClient
from decouple import config

# Read from .env
MONGO_URI = config("MONGO_URI")
MONGO_DB = config("MONGO_DB")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

users_collection = db["users"]
drivers_collection = db["drivers"]
