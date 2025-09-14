from pymongo import MongoClient
from decouple import config
from urllib.parse import quote_plus

# MongoDB settings from .env
MONGO_USER = config("MONGO_USER")
MONGO_PASS = config("MONGO_PASS")
MONGO_DB = config("MONGO_DB")

# Encode special characters in the password
password_encoded = quote_plus(MONGO_PASS)

# Build the correct URI
MONGO_URI = f"mongodb+srv://{MONGO_USER}:{password_encoded}@cluster0.ulpdfeb.mongodb.net/{MONGO_DB}?retryWrites=true&w=majority&appName=Cluster0"

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[MONGO_DB]

# Collections
users_collection = db["users"]
drivers_collection = db["drivers"]
products_collection = db["products"]
orders_collection = db["orders"]
notifications_collection = db["notifications"]
