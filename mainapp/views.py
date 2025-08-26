from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from bcrypt import hashpw, gensalt
from datetime import datetime
from .serializers import UserSerializer, LoginSerializer
from db import db
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from bcrypt import checkpw
from bson import ObjectId
from datetime import datetime, timedelta
import uuid
from django.utils.timezone import now
from django.core.mail import send_mail
import random





# Access the users collection
users_collection = db.get_collection("users")  
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_TIME_MINUTES = 15 
RESET_TOKEN_EXPIRY_HOURS = 1 
MAX_FORGOT_REQUESTS = 3
FORGOT_REQUEST_WINDOW_MINUTES = 15
RESET_CODE_EXPIRY_MINUTES = 15



@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    try:
        if request.user and request.user.is_authenticated:
            return Response({"error": "You are already logged in."}, status=403)

        serializer = UserSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=400)

        data = serializer.validated_data

        # Check uniqueness
        existing_user = users_collection.find_one({
            "$or": [
                {"username": data['username']},
                {"email": data['email']},
                {"phone_number": data['phone_number']}
            ]
        })
        if existing_user:
            return Response({"error": "Username, email, or phone number already exists"}, status=400)

        # Hash password
        hashed_pw = hashpw(data['password'].encode(), gensalt())
        data['password'] = hashed_pw
        data.pop('confirm_password', None)

        # Add defaults
        data['created_at'] = datetime.now()
        data['role'] = 'user'
        data['verified'] = False
        data['verification_token'] = str(uuid.uuid4())
        data['verification_code'] = str(random.randint(100000, 999999)) 

        # Insert into DB
        inserted_id = users_collection.insert_one(data).inserted_id

        # Send verification email
        verification_link = f"http://localhost:8000/api/verify/?token={data['verification_token']}"
        send_mail(
    subject="Verify your Luminan account",
    message=f"Welcome! Verify via link: {verification_link} \nOr enter this code: {data['verification_code']}",
    from_email="Luminan Support <no-reply@thisisluminanverifyaccount.com>",
    recipient_list=[data['email']],
    fail_silently=False,
)




        return Response({
            "message": "User registered successfully. Please check your email to verify your account.",
            "user_id": str(inserted_id)
        }, status=201)

    except Exception as e:
        return Response({"error": "Registration failed", "details": str(e)}, status=500)




#Users login_view 

def create_jwt_for_mongo_user(user):
    refresh = RefreshToken()
    refresh['user_id'] = str(user["_id"])
    refresh['username'] = user["username"]
    refresh['role'] = user.get("role", "user")

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token)
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    try:
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=400)

        data = serializer.validated_data
        identifier = data["identifier"]
        password = data["password"]

        user = users_collection.find_one({
            "$or": [
                {"username": identifier},
                {"phone_number": identifier}
            ]
        })

        if not user:
            return Response({"error": "Invalid username/phone number or password."}, status=401)

        # Check if user is verified
        if not user.get("verified", False):
            return Response({"error": "Account not verified. Please verify your account first."}, status=403)

        # Check if account is temporarily locked due to too many failed attempts
        failed_attempts = user.get("failed_attempts", 0)
        last_failed = user.get("last_failed_login")
        if failed_attempts >= MAX_FAILED_ATTEMPTS:
            if last_failed:
                last_failed_dt = datetime.fromisoformat(last_failed)
                if datetime.now() < last_failed_dt + timedelta(minutes=LOCKOUT_TIME_MINUTES):
                    return Response({"error": "Account temporarily locked due to multiple failed login attempts. Try again later."}, status=403)
            else:
                # reset if last_failed not set
                users_collection.update_one({"_id": user["_id"]}, {"$set": {"failed_attempts": 0}})

        # Verify password
        if not checkpw(password.encode(), user['password']):
            # Increment failed attempts
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$inc": {"failed_attempts": 1}, "$set": {"last_failed_login": datetime.now().isoformat()}}
            )
            return Response({"error": "Invalid username/phone number or password."}, status=401)

        # Reset failed attempts on successful login
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"failed_attempts": 0, "last_failed_login": None, "last_login": datetime.now().isoformat()}}
        )

        tokens = create_jwt_for_mongo_user(user)

        return Response({
            "message": "Login successful",
            "user_id": str(user["_id"]),
            "username": user["username"],
            "role": user.get("role", "user"),
            "tokens": tokens
        }, status=200)

    except Exception as e:
        return Response({"error": "Login failed", "details": str(e)}, status=500)




@api_view(['POST'])
@permission_classes([AllowAny])
def verify_account(request):
    try:
        token = request.data.get("token")
        if not token:
            return Response({"error": "Verification token is required"}, status=400)

        # Find user with this token
        user = users_collection.find_one({"verification_token": token})
        if not user:
            return Response({"error": "Invalid or expired verification token"}, status=400)

        # Update user as verified and remove token
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"verified": True}, "$unset": {"verification_token": ""}}
        )

        return Response({"message": "Account verified successfully"}, status=200)

    except Exception as e:
        return Response({"error": "Verification failed", "details": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_account_code(request):
    try:
        code = request.data.get("code")
        if not code:
            return Response({"error": "Verification code is required"}, status=400)

        user = users_collection.find_one({"verification_code": code})
        if not user:
            return Response({"error": "Invalid verification code"}, status=400)

        # Mark as verified and remove code/token
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"verified": True}, "$unset": {"verification_token": "", "verification_code": ""}}
        )

        return Response({"message": "Account verified successfully"}, status=200)

    except Exception as e:
        return Response({"error": "Verification failed", "details": str(e)}, status=500)



 
@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Only logged-in users can access
def get_profile(request):
    try:
        # Extract user_id from the JWT payload (stored in request.user after authentication)
        user_id = request.user.user_id  

        # Fetch user from MongoDB
        user = users_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})  # exclude password
        if not user:
            return Response({"error": "User not found"}, status=404)

        # Convert ObjectId to string
        user['_id'] = str(user['_id'])

        return Response({"profile": user}, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch profile", "details": str(e)}, status=500)       
    








@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email")
    if not email:
        return Response({"error": "Email is required"}, status=400)

    user = users_collection.find_one({"email": email})
    if not user:
        return Response({"error": "No account found with this email"}, status=404)

    # Rate-limiting
    now = datetime.now()
    last_request = user.get("last_forgot_request")
    request_count = user.get("forgot_request_count", 0)

    if last_request:
        last_request_dt = datetime.fromisoformat(last_request)
        if now - last_request_dt < timedelta(minutes=FORGOT_REQUEST_WINDOW_MINUTES):
            if request_count >= MAX_FORGOT_REQUESTS:
                return Response({
                    "error": f"Too many password reset requests. Try again after {FORGOT_REQUEST_WINDOW_MINUTES} minutes."
                }, status=429)
        else:
            request_count = 0  # reset count after window

    # Generate 6-digit reset code
    reset_code = str(random.randint(100000, 999999))
    expires_at = now + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES)

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_code": reset_code,
            "reset_code_expiry": expires_at.isoformat(),
            "last_forgot_request": now.isoformat(),
            "forgot_request_count": request_count + 1
        }}
    )

    # Send email with 6-digit code
    send_mail(
        subject="Luminan Password Reset Code",
        message=f"Your password reset code is: {reset_code}\nThis code expires in {RESET_CODE_EXPIRY_MINUTES} minutes.",
        from_email="Luminan Support <no-reply@thisisluminanverifyaccount.com>",
        recipient_list=[email],
        fail_silently=False
    )

    return Response({"message": "Password reset code sent to your email."}, status=200)



@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    try:
        # Get input
        code = request.data.get("code")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        # Validate inputs
        if not all([code, new_password, confirm_password]):
            return Response({"error": "Code, new password, and confirm password are required"}, status=400)
        if new_password != confirm_password:
            return Response({"error": "Passwords do not match"}, status=400)

        # Fetch user with the provided code (strip whitespace, ensure string)
        code = str(code).strip()
        user = users_collection.find_one({"reset_code": code})
        if not user:
            return Response({"error": "Invalid or expired code"}, status=400)

        # Validate code expiry
        expiry_str = user.get("reset_code_expiry")
        if not expiry_str:
            return Response({"error": "Reset code is invalid or missing expiry"}, status=400)

        try:
            expiry = datetime.fromisoformat(expiry_str)
        except Exception:
            return Response({"error": "Reset code expiry format is invalid"}, status=500)

        if datetime.now() > expiry:
            return Response({"error": "Reset code has expired"}, status=400)

        # Hash the new password
        hashed_pw = hashpw(new_password.encode(), gensalt())

        # Update user password and remove reset code fields
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"password": hashed_pw}, "$unset": {"reset_code": "", "reset_code_expiry": ""}}
        )

        return Response({"message": "Password reset successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Password reset failed", "details": str(e)}, status=500)