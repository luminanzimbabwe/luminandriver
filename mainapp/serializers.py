# serializers.py
from rest_framework import serializers
import re
from db import users_collection

class UserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(max_length=15)
    address = serializers.CharField(max_length=255)

    def validate_username(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters.")
        if users_collection.find_one({"username": value}):
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        if users_collection.find_one({"email": value}):
            raise serializers.ValidationError("Email already registered.")
        return value

    def validate_phone_number(self, value):
        pattern = r"^(?:\+263|0)\d{8,9}$"
        if not re.match(pattern, value):
            raise serializers.ValidationError("Invalid Zimbabwe phone number.")
        if users_collection.find_one({"phone_number": value}):
            raise serializers.ValidationError("Phone number already registered.")
        return value

    def validate_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters.")
        if not re.search(r"\d", value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not re.search(r"[A-Z]", value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        # Optional: special character
        # if not re.search(r"[!@#$%^&*()_+=\-]", value):
        #     raise serializers.ValidationError("Password must contain a special character.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data



#login serializer

class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True)  # username or phone_number
    password = serializers.CharField(required=True, write_only=True)
