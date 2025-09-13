from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")  # adjust your URI
db = client["luminan_db"]  # your database name
notifications = db["notifications"]  # your collection
