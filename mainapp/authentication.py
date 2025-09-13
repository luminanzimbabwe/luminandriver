# myapp/authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from bson import ObjectId
from .token_utils import authenticate_access_token
from db import users_collection, drivers_collection


class MongoUser:
    """Wrapper for a MongoDB user document for DRF."""
    def __init__(self, data):
        self._data = data
        self.id = str(data["_id"])
        self.username = data.get("username", "")
        self.email = data.get("email", "")

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __getitem__(self, key):
        return self._data.get(key)

    def __getattr__(self, attr):
        if attr in self._data:
            return self._data[attr]
        raise AttributeError(f"'MongoUser' object has no attribute '{attr}'")


class MongoDriver:
    """Wrapper for a MongoDB driver document for DRF."""
    def __init__(self, data):
        self._data = data
        self.id = str(data["_id"])
        self.username = data.get("username", "")
        self.email = data.get("email", "")

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __getitem__(self, key):
        return self._data.get(key)

    def __getattr__(self, attr):
        if attr in self._data:
            return self._data[attr]
        raise AttributeError(f"'MongoDriver' object has no attribute '{attr}'")


class UserTokenAuthentication(BaseAuthentication):
    """Authenticate users via token in Authorization header."""
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None  # DRF will handle unauthenticated request

        try:
            prefix, access_token = auth_header.split(" ")
        except ValueError:
            raise exceptions.AuthenticationFailed("Invalid Authorization header format")

        if prefix.lower() != "bearer":
            raise exceptions.AuthenticationFailed("Authorization header must start with Bearer")

        user_id = authenticate_access_token(access_token)
        if not user_id:
            raise exceptions.AuthenticationFailed("Invalid or expired access token")

        try:
            user_doc = users_collection.find_one({"_id": ObjectId(user_id)})
        except Exception:
            raise exceptions.AuthenticationFailed("Invalid user ID format")

        if not user_doc:
            raise exceptions.AuthenticationFailed("User not found")

        return (MongoUser(user_doc), None)


class DriverTokenAuthentication(BaseAuthentication):
    """Authenticate drivers via token in Authorization header."""
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None  # DRF will handle unauthenticated request

        try:
            prefix, access_token = auth_header.split(" ")
        except ValueError:
            raise exceptions.AuthenticationFailed("Invalid Authorization header format")

        if prefix.lower() != "bearer":
            raise exceptions.AuthenticationFailed("Authorization header must start with Bearer")

        driver_id = authenticate_access_token(access_token)
        if not driver_id:
            raise exceptions.AuthenticationFailed("Invalid or expired access token")

        try:
            driver_doc = drivers_collection.find_one({"_id": ObjectId(driver_id)})
        except Exception:
            raise exceptions.AuthenticationFailed("Invalid driver ID format")

        if not driver_doc:
            
            raise exceptions.AuthenticationFailed("Driver not found")

        return (MongoDriver(driver_doc), None)
