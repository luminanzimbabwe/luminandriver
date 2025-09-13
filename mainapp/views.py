from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from bcrypt import hashpw, gensalt
from datetime import datetime
import traceback
from django.views.decorators.csrf import csrf_exempt
from .serializers import UserSerializer, LoginSerializer
from db import db
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from bcrypt import checkpw
from .token_utils import generate_tokens 
from bson import ObjectId
from datetime import datetime, timedelta
import uuid
from django.utils.timezone import now
from django.core.mail import send_mail
from .token_utils import refresh_access_token 
import random
from django.template.loader import render_to_string
from django.contrib.auth.models import AnonymousUser
import pytz
from uuid import uuid4
from decouple import config
import jwt
from .serializers import NotificationSerializer
from .mongo import notifications 
from rest_framework.authentication import SessionAuthentication
from mainapp.authentication import UserTokenAuthentication, DriverTokenAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from .utils import create_simple_token 
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from bson import ObjectId
from datetime import datetime
import bcrypt
import secrets


# Access the users collection
users_collection = db.get_collection("users")  
drivers_collection = db.get_collection("drivers")
company_collaction = db.get_collection("company")
products = db.products
gas_orders = db.gas_orders
notifications = db.notifications
companies_collection = db["companies"] 


LOCAL_TZ = pytz.timezone("Africa/Harare")
now = datetime.now(LOCAL_TZ)

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_TIME_MINUTES = 15 
RESET_TOKEN_EXPIRY_HOURS = 10000000000 
MAX_FORGOT_REQUESTS = 3
FORGOT_REQUEST_WINDOW_MINUTES = 15
RESET_CODE_EXPIRY_MINUTES = 15


MAX_FAILED_ATTEMPTS = 5
LOCKOUT_TIME_MINUTES = 15
JWT_SECRET = config("SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_EXP_DELTA_SECONDS = 60 * 60 * 24  # 1 day, for example
JWT_EXP_DELTA_MINUTES = 60 * 60 * 24


@api_view(['GET'])
@permission_classes([AllowAny])
def test_view(request):
    return Response({"message": "hello world"})



def get_user_from_token(token):
    return users_collection.find_one({"auth_token": token})





@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    data = request.data
    try:
        # Validate required fields
        required_fields = ["username", "email", "phone_number", "password", "confirm_password"]
        for field in required_fields:
            if not data.get(field):
                return Response({"error": f"{field} is required"}, status=400)

        if data["password"] != data["confirm_password"]:
            return Response({"error": "Passwords do not match"}, status=400)

        # Check for existing user
        if users_collection.find_one({"$or": [{"username": data["username"]}, {"email": data["email"]}]}):
            return Response({"error": "Username or email already exists"}, status=400)

        # Hash password
        hashed_pw = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt())

        # Create user document
        user_doc = {
            "username": data["username"],
            "email": data["email"],
            "phone_number": data["phone_number"],
            "password": hashed_pw,
            "role": "user",
            "auth_token": secrets.token_hex(32),  # generate auth token
            "created_at": datetime.now().isoformat(),
        }

        inserted_id = users_collection.insert_one(user_doc).inserted_id

        # Return single user object
        user_doc["_id"] = str(inserted_id)
        user_doc.pop("password")  # optional: don’t return hashed password

        return Response({"user": user_doc}, status=201)

    except Exception as e:
        return Response({"error": "Registration failed", "details": str(e)}, status=500)




@api_view(['GET'])
@permission_classes([AllowAny])
def get_current_user(request):
    user_id = request.query_params.get("id")  # client must send ?id=...
    if not user_id:
        return Response({"error": "User ID required"}, status=400)

    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        return Response({"error": "User not found"}, status=404)

    return Response({
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "phone_number": user["phone_number"],
        "role": user.get("role", "user"),
        "verified": user.get("verified", False)
    })


#Users login_view



@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    try:
        data = request.data
        identifier = data.get("identifier")
        password = data.get("password")

        if not identifier or not password:
            return Response({"error": "Identifier and password are required"}, status=400)

        # Find user by username, email, or phone
        user = users_collection.find_one({
            "$or": [
                {"username": identifier},
                {"email": identifier},
                {"phone_number": identifier}
            ]
        })

        if not user:
            return Response({"error": "Invalid username/email/phone or password"}, status=401)

        # Verify password
        stored_password = user['password']
        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')

        if not checkpw(password.encode('utf-8'), stored_password):
            return Response({"error": "Invalid username/email/phone or password"}, status=401)

        # Generate new auth token
        auth_token = secrets.token_hex(32)
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"auth_token": auth_token, "last_login": datetime.utcnow()}}
        )

        # Return single user object
        user_resp = {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user.get("email"),
            "phone_number": user.get("phone_number"),
            "role": user.get("role", "user"),
            "auth_token": auth_token,
            "verified": user.get("verified", True)  # if you removed verification, default True
        }

        return Response({"user": user_resp}, status=200)

    except Exception as e:
        return Response({"error": "Login failed", "details": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_account(request):
    try:
        token = request.data.get("token")
        if not token:
            return Response({"error": "Verification token is required"}, status=400)

        user = users_collection.find_one({"verification_token": token})
        if not user:
            return Response({"error": "Invalid or expired verification token"}, status=400)

        expires_at_str = user.get("verification_expires_at")
        if not expires_at_str:
            return Response({"error": "Verification token missing expiry"}, status=400)

        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.utcnow() > expires_at:
            return Response({"error": "Verification token has expired"}, status=400)

        # Mark as verified and remove token/code/expiry
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"verified": True}, "$unset": {
                "verification_token": "",
                "verification_code": "",
                "verification_expires_at": ""
            }}
        )

        # Generate custom access + refresh tokens
        from .token_utils import generate_tokens
        tokens = generate_tokens(str(user["_id"]))

        profile_data = {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user.get("email"),
            "phone_number": user.get("phone_number"),
            "role": user.get("role", "user"),
            "verified": True
        }

        return Response({
            "message": "Account verified successfully",
            "tokens": tokens,
            "user": profile_data
        }, status=200)

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
            return Response({"error": "Invalid or expired verification code"}, status=400)

        expires_at_str = user.get("verification_expires_at")
        if not expires_at_str:
            return Response({"error": "Verification code missing expiry"}, status=400)

        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.utcnow() > expires_at:
            return Response({"error": "Verification code has expired"}, status=400)

        # Mark as verified and remove token/code/expiry
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"verified": True}, "$unset": {
                "verification_token": "",
                "verification_code": "",
                "verification_expires_at": ""
            }}
        )

        # Generate custom access + refresh tokens
        from .token_utils import generate_tokens
        tokens = generate_tokens(str(user["_id"]))

        profile_data = {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user.get("email"),
            "phone_number": user.get("phone_number"),
            "role": user.get("role", "user"),
            "verified": True
        }

        return Response({
            "message": "Account verified successfully",
            "tokens": tokens,
            "user": profile_data
        }, status=200)

    except Exception as e:
        return Response({"error": "Verification failed", "details": str(e)}, status=500)





@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token_view(request):
    try:
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            return Response({"error": "Refresh token is required"}, status=400)

        # Generate a new access token using the refresh token
        new_tokens = refresh_access_token(refresh_token)
        if not new_tokens:
            return Response({"error": "Invalid or expired refresh token"}, status=401)

        return Response({
            "message": "Access token refreshed successfully",
            "tokens": new_tokens
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to refresh token", "details": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])  # auth handled manually
def get_profile(request):
    try:
        # Get token from Authorization header
        token = request.headers.get("Authorization")
        if not token:
            return Response({"error": "Forbidden: No token provided"}, status=403)

        # Remove "Bearer " prefix if included
        if token.startswith("Bearer "):
            token = token[7:]

        user = get_user_from_token(token)
        if not user:
            return Response({"error": "Forbidden: Invalid or expired token"}, status=403)

        # Return only relevant fields to avoid sending sensitive data
        profile_data = {
            "id": str(user["_id"]),
            "username": user.get("username"),
            "email": user.get("email"),
            "phone_number": user.get("phone_number"),
            "role": user.get("role", "user"),
            "verified": user.get("verified", True),
            "created_at": user.get("created_at")
        }

        return Response({"profile": profile_data}, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch profile", "details": str(e)}, status=500)



@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    try:
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)

        user = users_collection.find_one({"email": email})
        if not user:
            # Generic response to prevent enumeration
            return Response({"message": "If this account exists, a reset code has been sent."}, status=200)

        now = datetime.utcnow()
        last_request = user.get("last_forgot_request")
        request_count = user.get("forgot_request_count", 0)

        if last_request:
            last_request_dt = datetime.fromisoformat(last_request)
            if now - last_request_dt < timedelta(minutes=FORGOT_REQUEST_WINDOW_MINUTES):
                if request_count >= MAX_FORGOT_REQUESTS:
                    return Response({"error": "Too many password reset requests. Try again later."}, status=429)
            else:
                request_count = 0  # reset counter if outside window

        # Generate reset code
        reset_code_plain = str(random.randint(100000, 999999))
        reset_code_hashed = hashpw(reset_code_plain.encode(), gensalt())
        expires_at = now + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES)

        # Save to MongoDB
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "reset_code": reset_code_hashed.decode(),  # store as string
                "reset_code_expiry": expires_at.isoformat(),
                "last_forgot_request": now.isoformat(),
                "forgot_request_count": request_count + 1
            }}
        )

        # Send email
        html_content = render_to_string('emails/reset_password.html', {
            'user': user,
            'code': reset_code_plain,
            'expiry_minutes': RESET_CODE_EXPIRY_MINUTES
        })

        send_mail(
            subject="Luminan Password Reset Request",
            message=f"Your password reset code is: {reset_code_plain}",
            from_email="Luminan Support <support@luminan.com>",
            recipient_list=[email],
            html_message=html_content,
            fail_silently=False
        )

        return Response({"message": "If this account exists, a reset code has been sent."}, status=200)

    except Exception as e:
        return Response({"error": "Failed to process password reset", "details": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    try:
        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not all([email, code, new_password, confirm_password]):
            return Response({"error": "Email, code, new password, and confirm password are required"}, status=400)
        if new_password != confirm_password:
            return Response({"error": "Passwords do not match"}, status=400)

        user = users_collection.find_one({"email": email})
        if not user or "reset_code" not in user:
            return Response({"error": "Invalid or expired code"}, status=400)

        # Check reset code
        stored_code = user["reset_code"].encode('utf-8') if isinstance(user["reset_code"], str) else user["reset_code"]
        if not checkpw(code.encode(), stored_code):
            return Response({"error": "Invalid or expired code"}, status=400)

        # Check expiry
        expiry_str = user.get("reset_code_expiry")
        if not expiry_str or datetime.utcnow() > datetime.fromisoformat(expiry_str):
            return Response({"error": "Reset code has expired"}, status=400)

        # Hash new password
        hashed_pw = hashpw(new_password.encode(), gensalt()).decode('utf-8')
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"password": hashed_pw}, "$unset": {"reset_code": "", "reset_code_expiry": ""}}
        )

        # Send confirmation email
        html_content = render_to_string('emails/password_reset_success.html', {'user': user})
        send_mail(
            subject="Your Luminan Password Has Been Reset",
            message="Your password was reset successfully.",
            from_email="Luminan Support <support@luminan.com>",
            recipient_list=[user['email']],
            html_message=html_content,
            fail_silently=False
        )

        return Response({"message": "Password reset successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Password reset failed", "details": str(e)}, status=500)



# -------------------------
# Logout endpoint


# -------------------------
# Logout endpoint
# -------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def logout_user(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token or not get_user_from_token(token):
        return Response({"error": "Invalid or missing token"}, status=403)

    # For simple token auth, logout is just client-side: remove token from app
    return Response({"message": "Logged out successfully."}, status=200)


# -------------------------
# Delete account endpoint
# -------------------------
@api_view(['DELETE'])
@permission_classes([AllowAny])
def delete_account(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)
    if not user:
        return Response({"error": "Invalid or missing token"}, status=403)

    try:
        result = users_collection.delete_one({"_id": ObjectId(user["_id"])})
        if result.deleted_count == 0:
            return Response({"error": "User not found"}, status=404)

        return Response({"message": "Account deleted successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Account deletion failed", "details": str(e)}, status=500)

#.......logic gas orders 



def is_valid_objectid(id_str):
    try:
        ObjectId(id_str)
        return True
    except Exception:
        return False



@api_view(['POST'])
@permission_classes([AllowAny])
def create_gas_order(request):
    try:
        # --- Authenticate user ---
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user = get_user_from_token(token)
        if not user:
            return Response({"error": "Forbidden: Invalid token"}, status=403)

        data = request.data

        # --- Validate required fields ---
        for field in ["delivery_address", "payment_method"]:
            if not data.get(field):
                return Response({"error": f"{field} is required"}, status=400)

        delivery_address = data["delivery_address"].strip()
        notes = data.get("notes", "").strip()

        # --- Product Handling ---
        product_id = data.get("product_id")
        product = None
        vendor_id = None
        weight = None

        if product_id:
            try:
                if is_valid_objectid(str(product_id)):
                    product = products.find_one({"_id": ObjectId(product_id)})
                else:
                    product_index = int(product_id)
                    all_products = list(products.find().sort("_id", 1))
                    if 0 <= product_index < len(all_products):
                        product = all_products[product_index]
                    else:
                        return Response({"error": "Product index out of range"}, status=400)
                if not product:
                    return Response({"error": "Product not found"}, status=404)

                # Use customer-provided weight if exists; else product weight
                weight = float(data.get("weight") or str(product.get("weight", "1")).replace("kg", ""))

                vendor_id = product.get("vendor_id")
                product_id = str(product["_id"])

            except Exception as e:
                return Response({"error": "Invalid product_id", "details": str(e)}, status=400)
        else:
            # Custom order
            try:
                weight = float(data.get("weight", 1))
                if weight <= 0:
                    raise ValueError("Weight must be positive")
            except (TypeError, ValueError):
                return Response({"error": "Invalid or missing weight for custom order"}, status=400)

        # --- Quantity & surcharge ---
        try:
            quantity = int(data.get("quantity", 1))
            if quantity <= 0:
                quantity = 1
        except (TypeError, ValueError):
            quantity = 1

        driver_surcharge = float(data.get("driver_surcharge", 0))

        # --- Build order document ---
        now = datetime.now(LOCAL_TZ)
        order = {
            "customer_id": ObjectId(str(user["_id"])) if user else None,
            "customer_name": user.get("name", "N/A"),
            "customer_phone": data.get("phone") or user.get("phone") or "N/A",
            "product_id": ObjectId(product_id) if product_id else None,
            "vendor_id": vendor_id,
            "quantity": quantity,
            "unit_price": None,     # will be set when driver assigned
            "total_price": 0,       # will be set after driver assignment
            "delivery_type": data.get("delivery_type", "home_delivery"),
            "delivery_address": delivery_address,
            "scheduled_time": data.get("scheduled_time"),
            "payment_method": data["payment_method"],
            "payment_status": "pending",
            "order_status": "pending",
            "assigned_driver_id": None,
            "notes": notes,
            "driver_surcharge": driver_surcharge,
            "weight": weight,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        # --- Save to DB ---
        inserted_id = gas_orders.insert_one(order).inserted_id
        order_id_str = str(inserted_id)

        # --- Send notifications ---
        send_notification(
            user_id=user["_id"],
            type_="order",
            message=f"Your order {order_id_str} has been created successfully! "
                    "We will calculate the price after a driver is assigned.",
            order_id=order_id_str
        )

        return Response({
            "message": "Order created successfully",
            "order_id": order_id_str,
            "order_status": "pending"
        }, status=201)

    except Exception as e:
        print("Error creating order:", str(e))
        return Response({"error": "Failed to create order", "details": str(e)}, status=500)





@api_view(['PATCH'])
@permission_classes([AllowAny])
def assign_driver(request, order_id):
    """
    Assign a driver to a gas order.
    Updates unit_price, total_price, and notifies customer and driver.
    """
    try:
        driver_id = request.data.get("driver_id")
        if not driver_id:
            return Response({"error": "driver_id is required"}, status=400)

        # Convert IDs to ObjectId
        try:
            oid_order = ObjectId(order_id)
            oid_driver = ObjectId(driver_id)
        except Exception:
            return Response({"error": "Invalid order_id or driver_id"}, status=400)

        # Fetch order
        order = gas_orders.find_one({"_id": oid_order})
        if not order:
            return Response({"error": "Order not found"}, status=404)

        # Prevent double assignment
        if order.get("assigned_driver_id"):
            return Response({"error": "Order already has a driver assigned"}, status=400)

        # Fetch driver
        driver = drivers_collection.find_one({"_id": oid_driver})
        if not driver:
            return Response({"error": "Driver not found"}, status=404)

        # --- Get driver's price_per_kg ---
        driver_price = driver.get("price_per_kg")
        if not driver_price or driver_price <= 0:
            return Response({"error": "Driver does not have a valid price_per_kg set"}, status=400)

        unit_price = float(driver_price)
        weight = float(order.get("weight", 1))
        quantity = int(order.get("quantity", 1))
        driver_surcharge = float(order.get("driver_surcharge", 0))

        # Calculate total price
        total_price = unit_price * weight * quantity + driver_surcharge
        now = datetime.now(LOCAL_TZ)

        # Update order with driver, unit_price, and total_price
        gas_orders.update_one(
            {"_id": oid_order},
            {"$set": {
                "assigned_driver_id": oid_driver,
                "unit_price": unit_price,
                "total_price": total_price,
                "updated_at": now.isoformat()
            }}
        )

        # Mark driver as busy
        drivers_collection.update_one({"_id": oid_driver}, {"$set": {"status": "busy"}})

        # --- Send notifications ---
        send_notification(
            user_id=order["customer_id"],
            type_="driver_assigned",
            message=f"A driver has been assigned to your order {order_id}.",
            order_id=order_id
        )

        send_notification(
            user_id=driver_id,
            type_="new_order",
            message=f"You have been assigned to order {order_id}.",
            order_id=order_id
        )

        updated_order = gas_orders.find_one({"_id": oid_order})

        return Response({
            "message": "Driver assigned successfully and notifications sent",
            "order": {
                "order_id": str(updated_order["_id"]),
                "driver_id": str(oid_driver),
                "unit_price": updated_order.get("unit_price"),
                "total_price": updated_order.get("total_price"),
                "order_status": updated_order.get("order_status"),
                "assigned_driver_id": str(updated_order.get("assigned_driver_id")),
            }
        }, status=200)

    except Exception as e:
        print("Error in assign_driver:", str(e))
        return Response({"error": "Failed to assign driver", "details": str(e)}, status=500)



@api_view(['GET'])
@permission_classes([AllowAny])  # still allowing any, but token check inside
def list_user_orders(request):
    print(">>> Request headers:", request.headers)

    try:
        # Authenticate user via token
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user = get_user_from_token(token)
        if not user:
            return Response({"error": "Forbidden: Invalid token"}, status=403)

        # Make sure user has _id
        if "_id" not in user:
            return Response({"error": "User ID not found in token"}, status=400)

        customer_id = ObjectId(str(user["_id"]))

        # Fetch user orders
        orders_cursor = gas_orders.find({"customer_id": customer_id}).sort("created_at", -1)
        orders = []
        for order in orders_cursor:
            orders.append({
    "order_id": str(order["_id"]),
    "product_id": str(order.get("product_id")) if order.get("product_id") else None,
    "quantity": order["quantity"],
    "weight": order.get("weight", 1),  # send weight
    "driver_surcharge": order.get("driver_surcharge", 0),  # send surcharge
    "total_price": order.get("total_price", 0),
    "unit_price": order.get("unit_price") or drivers_collection.get("price_per_kg", 0),
    "driver_surcharge": order.get("driver_surcharge", 0),

    "order_status": order["order_status"],
    "delivery_address": order["delivery_address"],
    "scheduled_time": order.get("scheduled_time"),
    "payment_method": order["payment_method"],
    "notes": order.get("notes"),
    "vendor_id": str(order.get("vendor_id")) if order.get("vendor_id") else None,
    "assigned_driver_id": str(order.get("assigned_driver_id")) if order.get("assigned_driver_id") else None,
    "created_at": order["created_at"]
})


        print(f">>> Fetched {len(orders)} orders for user {user.get('email', user.get('_id'))}")
        return Response({"orders": orders}, status=200)

    except Exception as e:
        print(">>> Exception in list_user_orders:", e)
        return Response({"error": "Failed to fetch orders", "details": str(e)}, status=500)




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_order_detail(request, order_id):
    try:
        # Convert order_id to ObjectId
        try:
            oid = ObjectId(order_id)
        except:
            return Response({"error": "Invalid order ID format"}, status=400)

        # Fetch order from MongoDB
        order = db.gas_orders.find_one({"_id": oid})
        if not order:
            return Response({"error": "Order not found"}, status=404)

        # Make sure the order belongs to the logged-in user
        if str(order["customer_id"]) != str(request.user["_id"]):
            return Response({"error": "You do not have permission to view this order"}, status=403)

        # Fetch product info
        product = db.products.find_one({"_id": order["product_id"]})
        product_name = product["name"] if product else "Unknown"

        # Prepare response
        order_detail = {
            "order_id": str(order["_id"]),
            "product_name": product_name,
            "quantity": order["quantity"],
            "unit_price": order["unit_price"],
            "total_price": order["total_price"],
            "delivery_address": order["delivery_address"],
            "delivery_type": order.get("delivery_type"),
            "scheduled_time": order.get("scheduled_time"),
            "order_status": order["order_status"],
            "payment_status": order["payment_status"],
            "notes": order.get("notes"),
            "created_at": order.get("created_at"),
            "updated_at": order.get("updated_at")
        }

        return Response({"order": order_detail}, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch order details", "details": str(e)}, status=500)




def send_notification(user_id, type_, message, order_id=None):
    notifications.insert_one({
        "user_id": ObjectId(user_id),
        "type": type_,
        "message": message,
        "order_id": ObjectId(order_id) if order_id else None,
        "read": False,
        "created_at": datetime.now(LOCAL_TZ)  # store as datetime, not string
    })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_order_status(request, order_id):
    try:
        data = request.data
        new_status = data.get("order_status")

        # Validate status
        if not new_status:
            return Response({"error": "order_status is required"}, status=400)

        allowed_statuses = ["pending", "out_for_delivery", "delivered", "cancelled"]
        if new_status not in allowed_statuses:
            return Response({"error": f"Invalid order_status. Allowed: {allowed_statuses}"}, status=400)

        # Convert order_id to ObjectId
        try:
            oid = ObjectId(order_id)
        except:
            return Response({"error": "Invalid order ID format"}, status=400)

        # Fetch order
        order = gas_orders.find_one({"_id": oid})
        if not order:
            return Response({"error": "Order not found"}, status=404)

        # Update order status and timestamp
        now = datetime.now(LOCAL_TZ)
        gas_orders.update_one(
            {"_id": oid},
            {"$set": {"order_status": new_status, "updated_at": now.isoformat()}}
        )

        # ✅ Send notifications
        # Notify the customer
        send_notification(
            user_id=order["customer_id"],
            type_="order_status",
            message=f"Your order {order_id} status has been updated to '{new_status}'.",
            order_id=order_id
        )

        # Notify assigned driver if any
        assigned_driver_id = order.get("assigned_driver_id")
        if assigned_driver_id:
            send_notification(
                user_id=assigned_driver_id,
                type_="order_status",
                message=f"Order {order_id} you are assigned to is now '{new_status}'.",
                order_id=order_id
            )

        return Response({
            "message": f"Order status updated to {new_status} and notifications sent",
            "order_id": order_id
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to update order status", "details": str(e)}, status=500)


# Helper function to send notification
def send_notification(user_id, type_, message, order_id=None):
    notifications.insert_one({
        "user_id": ObjectId(user_id),
        "type": type_,
        "message": message,
        "order_id": ObjectId(order_id) if order_id else None,
        "read": False,
        "created_at": datetime.now(LOCAL_TZ).isoformat()
    })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def cancel_order(request, order_id):
    try:
        # Convert order_id to ObjectId
        try:
            oid = ObjectId(order_id)
        except:
            return Response({"error": "Invalid order ID format"}, status=400)

        # Fetch order
        order = gas_orders.find_one({"_id": oid})
        if not order:
            return Response({"error": "Order not found"}, status=404)

        # Check if the logged-in user owns the order
        if str(order["customer_id"]) != str(request.user["_id"]):
            return Response({"error": "You are not allowed to cancel this order"}, status=403)

        # Check order status
        if order["order_status"] != "pending":
            return Response({"error": "Only pending orders can be cancelled"}, status=400)

        # Update status to cancelled
        now = datetime.now(LOCAL_TZ)
        gas_orders.update_one(
            {"_id": oid},
            {"$set": {"order_status": "cancelled", "updated_at": now.isoformat()}}
        )

        # ✅ Send notifications
        # Notify the vendor (if any assigned driver)
        assigned_driver_id = order.get("assigned_driver_id")
        if assigned_driver_id:
            send_notification(
                user_id=assigned_driver_id,
                type_="order_cancelled",
                message=f"Order {order_id} has been cancelled by the customer.",
                order_id=order_id
            )

        # Notify the customer (confirmation)
        send_notification(
            user_id=order["customer_id"],
            type_="order_cancelled",
            message=f"Your order {order_id} has been successfully cancelled.",
            order_id=order_id
        )

        return Response({
            "message": "Order cancelled successfully and notifications sent",
            "order_id": order_id
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to cancel order", "details": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_notifications(request):
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user = get_user_from_token(token)
        if not user:
            return Response({"error": "Forbidden: Invalid token"}, status=403)

        user_id = str(user["_id"])
        unread_only = request.GET.get("unread", "false").lower() == "true"

        query = {"user_id": ObjectId(user_id)}
        if unread_only:
            query["read"] = False

        cursor = notifications.find(query).sort("created_at", -1)
        notif_list = []
        for n in cursor:
            notif_list.append({
                "notification_id": str(n["_id"]),
                "type": n["type"],
                "message": n["message"],
                "order_id": str(n.get("order_id")) if n.get("order_id") else None,
                "read": n.get("read", False),
                "created_at": n.get("created_at")
            })

        serializer = NotificationSerializer(notif_list, many=True)
        return Response({"notifications": serializer.data}, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch notifications", "details": str(e)}, status=500)


# -------------------------
# Mark a single notification as read
# -------------------------
@api_view(['PATCH'])
@permission_classes([AllowAny])
def mark_notification_read(request, notification_id):
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user = get_user_from_token(token)
        if not user:
            return Response({"error": "Forbidden: Invalid token"}, status=403)

        try:
            oid = ObjectId(notification_id)
        except:
            return Response({"error": "Invalid notification ID"}, status=400)

        notif = notifications.find_one({"_id": oid, "user_id": ObjectId(user["_id"])})
        if not notif:
            return Response({"error": "Notification not found"}, status=404)

        notifications.update_one({"_id": oid}, {"$set": {"read": True}})
        return Response({"message": "Notification marked as read"}, status=200)

    except Exception as e:
        return Response({"error": "Failed to mark notification as read", "details": str(e)}, status=500)


# -------------------------
# Mark all notifications read
# -------------------------
@api_view(['PATCH'])
@permission_classes([AllowAny])
def mark_all_notifications_read(request):
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user = get_user_from_token(token)
        if not user:
            return Response({"error": "Forbidden: Invalid token"}, status=403)

        unread_only = request.data.get("unread_only", True)
        query = {"user_id": ObjectId(user["_id"])}
        if unread_only:
            query["read"] = False

        result = notifications.update_many(query, {"$set": {"read": True}})
        return Response({"message": f"{result.modified_count} notification(s) marked as read"}, status=200)

    except Exception as e:
        return Response({"error": "Failed to mark notifications as read", "details": str(e)}, status=500)


# -------------------------
# Get user profile
# -------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def get_user_profile(request):
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user = get_user_from_token(token)
        if not user:
            return Response({"error": "Forbidden: Invalid token"}, status=403)

        user_doc = users_collection.find_one(
            {"_id": ObjectId(user["_id"])},
            {"password": 0, "verification_token": 0, "verification_code": 0}
        )
        if not user_doc:
            return Response({"error": "User not found"}, status=404)

        user_doc["_id"] = str(user_doc["_id"])
        return Response({"user": user_doc}, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch profile", "details": str(e)}, status=500)


# -------------------------
# Update user profile
# -------------------------
@api_view(['PATCH'])
@permission_classes([AllowAny])
def update_user_profile(request):
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user = get_user_from_token(token)
        if not user:
            return Response({"error": "Forbidden: Invalid token"}, status=403)

        user_id = user["_id"]
        data = request.data
        update_fields = {}
        email_verification_needed = False

        # Update username
        if "username" in data:
            if users_collection.find_one({"username": data["username"], "_id": {"$ne": ObjectId(user_id)}}):
                return Response({"error": "Username already exists"}, status=400)
            update_fields["username"] = data["username"]

        # Update phone number
        if "phone_number" in data:
            if users_collection.find_one({"phone_number": data["phone_number"], "_id": {"$ne": ObjectId(user_id)}}):
                return Response({"error": "Phone number already exists"}, status=400)
            update_fields["phone_number"] = data["phone_number"]

        # Update password
        if "password" in data:
            from bcrypt import hashpw, gensalt
            hashed_pw = hashpw(data["password"].encode(), gensalt())
            update_fields["password"] = hashed_pw

        # Update email with verification
        if "email" in data:
            if users_collection.find_one({"email": data["email"], "_id": {"$ne": ObjectId(user_id)}}):
                return Response({"error": "Email already exists"}, status=400)

            import uuid, random
            verification_token = str(uuid.uuid4())
            verification_code = str(random.randint(100000, 999999))
            expires_at = datetime.utcnow() + timedelta(hours=24)

            update_fields.update({
                "new_email": data["email"],
                "email_verified": False,
                "verification_token": verification_token,
                "verification_code": verification_code,
                "verification_expires_at": expires_at.isoformat()
            })

            email_verification_needed = True

        if not update_fields:
            return Response({"message": "No valid fields to update"}, status=400)

        update_fields["updated_at"] = datetime.utcnow().isoformat()
        users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

        if email_verification_needed:
            verification_link = f"http://localhost:8000/api/verify/?token={verification_token}"
            html_content = render_to_string('emails/verification.html', {
                'user': {"username": user["username"]},
                'code': verification_code,
                'link': verification_link
            })

            send_mail(
                subject="Verify your new email",
                message=f"Your email client does not support HTML. Verification code: {verification_code}",
                from_email="Luminan Support <support@luminan.com>",
                recipient_list=[data["email"]],
                html_message=html_content,
                fail_silently=False
            )
            return Response({"message": "Profile updated. Please verify your new email."}, status=200)

        return Response({"message": "Profile updated successfully"}, status=200)

    except Exception as e:
        return Response({"error": "Failed to update profile", "details": str(e)}, status=500)


# -------------------------
# Verify new email
# -------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_new_email(request):
    try:
        token = request.data.get("token")
        if not token:
            return Response({"error": "Verification token is required"}, status=400)

        user = users_collection.find_one({"verification_token": token})
        if not user:
            return Response({"error": "Invalid or expired verification token"}, status=400)

        expires_at_str = user.get("verification_expires_at")
        if not expires_at_str or datetime.utcnow() > datetime.fromisoformat(expires_at_str):
            return Response({"error": "Verification token has expired"}, status=400)

        new_email = user.get("new_email")
        if new_email:
            users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"email": new_email, "email_verified": True},
                 "$unset": {"new_email": "", "verification_token": "", "verification_code": "", "verification_expires_at": ""}}
            )
            return Response({"message": "New email verified successfully"}, status=200)

        return Response({"error": "No email to verify"}, status=400)

    except Exception as e:
        return Response({"error": "Failed to verify email", "details": str(e)}, status=500)


# -------------------------
# App trust endpoints
# -------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def get_trust_count(request):
    trust_doc = db.app_trust.find_one({"_id": "app_trust"})
    if not trust_doc:
        return Response({"trusted_users": 0, "trusted_drivers": 0}, status=200)
    return Response({
        "trusted_users": len(trust_doc.get("trusted_users", [])),
        "trusted_drivers": len(trust_doc.get("trusted_drivers", []))
    }, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def trust_app(request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = get_user_from_token(token)
    if not user:
        return Response({"error": "Forbidden: Invalid token"}, status=403)

    user_type = request.data.get("user_type")
    if user_type not in ["user", "driver"]:
        return Response({"error": "Invalid user_type"}, status=400)

    user_id = user["_id"]
    trust_doc = db.app_trust.find_one({"_id": "app_trust"})
    if not trust_doc:
        trust_doc = {"_id": "app_trust", "trusted_users": [], "trusted_drivers": []}
        db.app_trust.insert_one(trust_doc)

    key = "trusted_users" if user_type == "user" else "trusted_drivers"
    if user_id in trust_doc.get(key, []):
        return Response({"message": "You already trusted the app"}, status=200)

    db.app_trust.update_one({"_id": "app_trust"}, {"$push": {key: user_id}})
    return Response({"message": "Thank you for trusting the app"}, status=200)













# Helper function to send notification
def send_notification(user_id, type_, message, order_id=None):
    notifications.insert_one({
        "user_id": ObjectId(user_id),
        "type": type_,
        "message": message,
        "order_id": ObjectId(order_id) if order_id else None,
        "read": False,
        "created_at": datetime.now(LOCAL_TZ).isoformat()
    })



# Helper function to send notification
def send_notification(user_id, type_, message, order_id=None):
    notifications.insert_one({
        "user_id": ObjectId(user_id),
        "type": type_,
        "message": message,
        "order_id": ObjectId(order_id) if order_id else None,
        "read": False,
        "created_at": datetime.now(LOCAL_TZ).isoformat()
    })











#..................................................................................................................
#Drivers Logic
#......................................................................................................................




# ---------- REGISTER DRIVER ----------
@api_view(['POST'])
@permission_classes([AllowAny])
def register_driver(request):
    data = request.data
    try:
        # Validate required fields
        required_fields = ["username", "email", "password", "confirm_password",]
        for field in required_fields:
            if not data.get(field):
                return Response({"error": f"{field} is required"}, status=400)

        if data["password"] != data["confirm_password"]:
            return Response({"error": "Passwords do not match"}, status=400)

        # Check for existing driver in drivers_collection
        if drivers_collection.find_one({"$or": [{"username": data["username"]}, {"email": data["email"]}]}):
            return Response({"error": "Username or email already exists"}, status=400)

        # Hash password
        hashed_pw = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt())

        # Create driver document
        driver_doc = {
            "username": data["username"],
            "email": data["email"],
            "password": hashed_pw,
            "role": "driver",
            "auth_token": secrets.token_hex(32),
            "created_at": datetime.now().isoformat(),
        }

        inserted_id = drivers_collection.insert_one(driver_doc).inserted_id

        # Return driver object (without password)
        driver_doc["_id"] = str(inserted_id)
        driver_doc.pop("password")

        return Response({"driver": driver_doc}, status=201)

    except Exception as e:
        return Response({"error": "Registration failed", "details": str(e)}, status=500)


# ---------- LOGIN DRIVER ----------
@api_view(['POST'])
@permission_classes([AllowAny])
def login_driver(request):
    try:
        data = request.data
        identifier = data.get("identifier")  # can be username or email
        password = data.get("password")

        if not identifier or not password:
            return Response({"error": "Identifier and password are required"}, status=400)

        # Find driver by username or email in drivers_collection
        driver = drivers_collection.find_one({
            "$or": [
                {"username": identifier},
                {"email": identifier}
            ]
        })

        if not driver:
            return Response({"error": "Invalid username/email or password"}, status=401)

        # Verify password
        stored_password = driver['password']
        if isinstance(stored_password, str):
            stored_password = stored_password.encode('utf-8')

        if not checkpw(password.encode('utf-8'), stored_password):
            return Response({"error": "Invalid username/email or password"}, status=401)

        # Generate new auth token
        auth_token = secrets.token_hex(32)
        drivers_collection.update_one(
            {"_id": driver["_id"]},
            {"$set": {"auth_token": auth_token, "last_login": datetime.utcnow()}}
        )

        # Return driver object
        driver_resp = {
            "id": str(driver["_id"]),
            "username": driver["username"],
            "email": driver.get("email"),
            "role": driver.get("role", "driver"),
            "auth_token": auth_token,
        }

        return Response({"driver": driver_resp}, status=200)

    except Exception as e:
        return Response({"error": "Login failed", "details": str(e)}, status=500)


# ---------- Helper function to get driver from token ----------
def get_driver_from_token(request):
    """
    Extract driver from Authorization header using Bearer token convention.
    Returns (driver, None) on success or (None, Response) on failure.
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer ", "").strip()

        if not token:
            return None, Response({"error": "Authorization token required"}, status=401)

        driver = drivers_collection.find_one({"auth_token": token})
        if not driver:
            return None, Response({"error": "Invalid or expired token"}, status=401)

        return driver, None

    except Exception as e:
        return None, Response({"error": "Token parsing failed", "details": str(e)}, status=400)



from bson import ObjectId
from datetime import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

def safe_datetime(dt):
    if not dt:
        return None
    return dt.isoformat() if not isinstance(dt, str) else dt

def get_updated_order(order_id):
    order = gas_orders.find_one({"_id": ObjectId(order_id)})
    if not order:
        return None
    return {
        "order_id": str(order.get("_id")),
        "product_id": str(order.get("product_id")) if order.get("product_id") else None,
        "quantity": order.get("quantity", 0),
        "total_price": order.get("total_price"),
        "weight": order.get("weight", 1),
        "unit_price": order.get("unit_price") or drivers_collection.get("price_per_kg", 2),
        "order_status": order.get("status", "pending"),
        "delivery_address": order.get("delivery_address"),
        "scheduled_time": order.get("scheduled_time"),
        "payment_method": order.get("payment_method"),
        "notes": order.get("notes"),
        "created_at": safe_datetime(order.get("created_at")),
        "updated_at": safe_datetime(order.get("updated_at")),
        "delivered_at": safe_datetime(order.get("delivered_at")),
        "assigned_driver_id": str(order.get("assigned_driver_id")) if order.get("assigned_driver_id") else None,
        "customer_id": str(order.get("customer_id")) if order.get("customer_id") else None
    }

# ---------------- PATCH ENDPOINTS ----------------

@api_view(['PATCH'])
@permission_classes([AllowAny])
def confirm_order(request, order_id):
    driver, error_resp = get_driver_from_token(request)
    if error_resp: return error_resp

    try:
        oid_order = ObjectId(order_id)
        order = gas_orders.find_one({"_id": oid_order, "assigned_driver_id": driver["_id"]})
        if not order:
            return Response({"error": "Order not found or not assigned to you"}, status=404)

        gas_orders.update_one(
            {"_id": oid_order},
            {"$set": {"status": "confirmed", "updated_at": datetime.now()}}
        )

        updated_order = get_updated_order(order_id)
        return Response({"message": "Order confirmed successfully", "order": updated_order}, status=200)
    except Exception as e:
        return Response({"error": "Failed to confirm order", "details": str(e)}, status=500)

@api_view(['PATCH'])
@permission_classes([AllowAny])
def cancel_order(request, order_id):
    driver, error_resp = get_driver_from_token(request)
    if error_resp: return error_resp

    try:
        oid_order = ObjectId(order_id)
        order = gas_orders.find_one({"_id": oid_order, "assigned_driver_id": driver["_id"]})
        if not order:
            return Response({"error": "Order not found or not assigned to you"}, status=404)

        reason = request.data.get("reason", "Cancelled by driver")
        gas_orders.update_one(
            {"_id": oid_order},
            {"$set": {
                "status": "cancelled",
                "cancel_reason": reason,
                "updated_at": datetime.now()
            }}
        )

        drivers_collection.update_one({"_id": driver["_id"]}, {"$set": {"status": "available"}})

        updated_order = get_updated_order(order_id)
        return Response({"message": "Order cancelled successfully", "order": updated_order}, status=200)
    except Exception as e:
        return Response({"error": "Failed to cancel order", "details": str(e)}, status=500)

@api_view(['PATCH'])
@permission_classes([AllowAny])
def mark_delivered(request, order_id):
    driver, error_resp = get_driver_from_token(request)
    if error_resp: return error_resp

    try:
        oid_order = ObjectId(order_id)
        order = gas_orders.find_one({"_id": oid_order, "assigned_driver_id": driver["_id"]})
        if not order:
            return Response({"error": "Order not found or not assigned to you"}, status=404)

        gas_orders.update_one(
            {"_id": oid_order},
            {"$set": {
                "status": "delivered",
                "delivered_at": datetime.now(),
                "updated_at": datetime.now()
            }}
        )

        drivers_collection.update_one({"_id": driver["_id"]}, {"$set": {"status": "available"}})

        updated_order = get_updated_order(order_id)
        return Response({"message": "Order marked as delivered", "order": updated_order}, status=200)
    except Exception as e:
        return Response({"error": "Failed to mark order as delivered", "details": str(e)}, status=500)

# ---------------- GET ENDPOINT ----------------


@api_view(['GET'])
@permission_classes([AllowAny])
def driver_assigned_orders(request):
    driver, error_resp = get_driver_from_token(request)
    if error_resp:
        return error_resp

    try:
        driver_id = ObjectId(driver["_id"])
        orders_cursor = gas_orders.find({"assigned_driver_id": driver_id})
        orders = []

        for order in orders_cursor:
            # Use order's stored unit_price and total_price
            unit_price = order.get("unit_price") or 0
            weight = order.get("weight", 1)
            quantity = order.get("quantity", 1)
            driver_surcharge = order.get("driver_surcharge", 0)
            total_price = order.get("total_price") or (unit_price * weight * quantity + driver_surcharge)

            product_name = order.get("product_name")

            items = [{
                "name": product_name or "Custom Gas Order",
                "quantity": quantity,
                "description": order.get("product_description") if product_name else order.get("notes", ""),
                "total_price": total_price,
                "weight": weight,
                "unit_price": unit_price,
                "driver_surcharge": driver_surcharge,
            }]

            # Customer info
            customer_name = order.get("customer_name") or "N/A"
            customer_phone = order.get("customer_phone") or "N/A"
            customer_email = order.get("customer_email") or "N/A"

            orders.append({
                "order_id": str(order.get("_id")),
                "customer": {
                    "name": customer_name,
                    "phone": customer_phone,
                    "email": customer_email,
                },
                "items": items,
                "delivery_address": order.get("delivery_address", "N/A"),
                "notes": order.get("notes", "None"),
                "order_status": order.get("status", "pending"),
                "total_price": total_price,
                "scheduled_time": safe_datetime(order.get("scheduled_time")),
                "payment_method": order.get("payment_method", "N/A"),
                "created_at": safe_datetime(order.get("created_at")),
                "updated_at": safe_datetime(order.get("updated_at")),
                "delivered_at": safe_datetime(order.get("delivered_at")),
                "assigned_driver_id": str(order.get("assigned_driver_id")) if order.get("assigned_driver_id") else None,
            })

        return Response({"orders": orders}, status=200)

    except Exception as e:
        print(">>> Exception in driver_assigned_orders:", e)
        return Response(
            {"error": "Failed to fetch driver orders", "details": str(e)},
            status=500
        )




@api_view(['GET'])
@permission_classes([AllowAny])
def list_all_drivers(request):
    print("Authorization header:", request.headers.get("Authorization"))
    try:
        drivers_cursor = drivers_collection.find({})
        drivers_list = list(drivers_cursor)

        drivers = []
        for d in drivers_list:
            company = companies_collection.find_one({"company_id": d.get("company_id")})
            company_name = company.get("name", "Unknown Company") if company else "Unknown Company"

            drivers.append({
    "driver_id": str(d["_id"]),
    "username": d.get("username", ""),
    "company": {"company_name": company_name},  # fix: send as object
    "price_per_kg": d.get("price_per_kg", 0),
    "price_per_km": d.get("price_per_km", 0),
    "rating": d.get("rating", 0),
    "reviews_count": d.get("reviews_count", 0),
    "completed_deliveries": d.get("completed_deliveries", 0),
    "location": d.get("operation_area", ""),
    "vehicle_type": d.get("vehicle_type", "")
})


        return Response({"drivers": drivers}, status=200)

    except Exception as e:
        print("Error fetching drivers:", e)
        return Response({"error": "Failed to fetch drivers", "details": str(e)}, status=500)


# ---------- SET PRICE PER KG ----------
@api_view(['PATCH'])
@permission_classes([AllowAny])  # auth is manually checked
def set_price_per_kg(request):
    # --- Print Authorization headers ---
    auth_header = request.headers.get("Authorization")
    print("Received Authorization header:", auth_header)

    driver, error_resp = get_driver_from_token(request)
    if error_resp:
        print("Driver authentication failed")
        return error_resp

    print(f"Authenticated driver: {driver.get('username', 'UNKNOWN')} (ID: {driver['_id']})")

    try:
        price_per_kg_raw = request.data.get("price_per_kg", 0)
        print("Raw price_per_kg from request:", price_per_kg_raw)

        price_per_kg = float(price_per_kg_raw)
        if price_per_kg <= 0:
            print("Invalid price_per_kg:", price_per_kg)
            return Response({"error": "Invalid price"}, status=400)

        print(f"Updating driver {driver['_id']} price_per_kg to {price_per_kg}...")
        drivers_collection.update_one(
            {"_id": driver["_id"]},
            {"$set": {"price_per_kg": price_per_kg, "updated_at": datetime.now()}}
        )

        print("Price update successful")
        return Response(
            {"message": "Price per kg updated successfully", "price_per_kg": price_per_kg},
            status=200
        )

    except Exception as e:
        print("Exception occurred while setting price_per_kg:", str(e))
        return Response({"error": "Failed to set price", "details": str(e)}, status=500)
