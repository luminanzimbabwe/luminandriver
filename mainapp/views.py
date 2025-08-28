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
from django.template.loader import render_to_string
import pytz



# Access the users collection
users_collection = db.get_collection("users")  
products = db.products
gas_orders = db.gas_orders
notifications = db.notifications



LOCAL_TZ = pytz.timezone("Africa/Harare")
now = datetime.now(LOCAL_TZ)

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
        # Prevent logged-in users from registering again
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

        # Hash password with bcrypt
        hashed_pw = hashpw(data['password'].encode(), gensalt())
        data['password'] = hashed_pw
        data.pop('confirm_password', None)

        # Verification setup
        verification_token = str(uuid.uuid4())
        verification_code = str(random.randint(100000, 999999))
        expires_at = datetime.now() + timedelta(hours=24)  # token/code valid for 24 hours

        # Add defaults
        data.update({
            "created_at": datetime.now(),
            "role": "user",
            "verified": False,
            "verification_token": verification_token,
            "verification_code": verification_code,
            "verification_expires_at": expires_at.isoformat(),
        })

        # Insert into DB
        inserted_id = users_collection.insert_one(data).inserted_id

        # Prepare verification email
        verification_link = f"http://localhost:8000/api/verify/?token={verification_token}"
        html_content = render_to_string('emails/verification.html', {
            'user': data,
            'code': verification_code,
            'link': verification_link
        })

        # Send verification email
        send_mail(
            subject=f"Welcome to Luminan, {data['username']}!",
            message=f"Your email client does not support HTML. Your verification code is: {verification_code}",
            from_email="Luminan Support <support@luminan.com>",
            recipient_list=[data['email']],
            html_message=html_content,
            fail_silently=False
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

        # Check if token has expired
        expires_at_str = user.get("verification_expires_at")
        if not expires_at_str:
            return Response({"error": "Verification token missing expiry"}, status=400)

        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.now() > expires_at:
            return Response({"error": "Verification token has expired"}, status=400)

        # Update user as verified and remove token/code/expiry
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"verified": True}, "$unset": {
                "verification_token": "",
                "verification_code": "",
                "verification_expires_at": ""
            }}
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
            return Response({"error": "Invalid or expired verification code"}, status=400)

        # Check if code has expired
        expires_at_str = user.get("verification_expires_at")
        if not expires_at_str:
            return Response({"error": "Verification code missing expiry"}, status=400)

        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.now() > expires_at:
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

    # Prevent account enumeration: always respond with success
    if not user:
        return Response({"message": "If this account exists, a reset code has been sent."}, status=200)

    # Rate-limiting
    now = datetime.now()
    last_request = user.get("last_forgot_request")
    request_count = user.get("forgot_request_count", 0)

    if last_request:
        last_request_dt = datetime.fromisoformat(last_request)
        if now - last_request_dt < timedelta(minutes=FORGOT_REQUEST_WINDOW_MINUTES):
            if request_count >= MAX_FORGOT_REQUESTS:
                return Response({
                    "error": f"Too many password reset requests. Try again later."
                }, status=429)
        else:
            request_count = 0  # reset count after window

    # Generate 6-digit reset code
    reset_code_plain = str(random.randint(100000, 999999))
    reset_code_hashed = hashpw(reset_code_plain.encode(), gensalt())
    expires_at = now + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES)

    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_code": reset_code_hashed,
            "reset_code_expiry": expires_at.isoformat(),
            "last_forgot_request": now.isoformat(),
            "forgot_request_count": request_count + 1
        }}
    )

    # Prepare HTML email
    html_content = render_to_string('emails/reset_password.html', {
        'user': user,
        'code': reset_code_plain,
        'expiry_minutes': RESET_CODE_EXPIRY_MINUTES
    })

    # Send email
    send_mail(
        subject="Luminan Password Reset Request",
        message=f"Your password reset code is: {reset_code_plain}\nThis code expires in {RESET_CODE_EXPIRY_MINUTES} minutes.",
        from_email="Luminan Support <support@luminan.com>",
        recipient_list=[email],
        html_message=html_content,
        fail_silently=False
    )

    return Response({"message": "If this account exists, a reset code has been sent."}, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    try:
        code = request.data.get("code")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        # Validate inputs
        if not all([code, new_password, confirm_password]):
            return Response({"error": "Code, new password, and confirm password are required"}, status=400)
        if new_password != confirm_password:
            return Response({"error": "Passwords do not match"}, status=400)

        # Find user with a reset code
        user = users_collection.find_one({"reset_code": {"$exists": True}})
        if not user or not checkpw(code.encode(), user["reset_code"]):
            return Response({"error": "Invalid or expired code"}, status=400)

        # Validate code expiry
        expiry_str = user.get("reset_code_expiry")
        if not expiry_str:
            return Response({"error": "Reset code missing expiry"}, status=400)
        if datetime.now() > datetime.fromisoformat(expiry_str):
            return Response({"error": "Reset code has expired"}, status=400)

        # Hash the new password
        hashed_pw = hashpw(new_password.encode(), gensalt())

        # Update user password and remove reset code fields
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"password": hashed_pw}, "$unset": {"reset_code": "", "reset_code_expiry": ""}}
        )

        # Optional: send confirmation email
        html_content = render_to_string('emails/reset_password_success.html', {'user': user})
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
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    try:
        # Expect refresh token in request body
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token is required"}, status=400)

        # Blacklist the token
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()  # Requires SimpleJWT's blacklist app enabled
        except Exception:
            return Response({"error": "Invalid or expired token"}, status=400)

        return Response({"message": "Logged out successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Logout failed", "details": str(e)}, status=500)


# -------------------------
# Delete account endpoint
# -------------------------
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    try:
        user_id = request.user.user_id  # Extract user_id from JWT payload

        # Delete user from MongoDB
        result = users_collection.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            return Response({"error": "User not found"}, status=404)

        return Response({"message": "Account deleted successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Account deletion failed", "details": str(e)}, status=500)


#.......logic gas orders 



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_gas_order(request):
    try:
        data = request.data

        # ✅ Validate required fields
        required_fields = ["product_id", "quantity", "delivery_address", "payment_method"]
        for field in required_fields:
            if field not in data:
                return Response({"error": f"{field} is required"}, status=400)

        # ✅ Fetch product
        product = products.find_one({"_id": ObjectId(data["product_id"])})
        if not product:
            return Response({"error": "Invalid product_id"}, status=404)

        # ✅ Calculate pricing
        unit_price = product["price"]
        quantity = int(data["quantity"])
        total_price = unit_price * quantity

        # ✅ Build order document
        now = datetime.now(LOCAL_TZ)
        order = {
            "customer_id": ObjectId(request.user["_id"]),
            "product_id": ObjectId(data["product_id"]),
            "vendor_id": product.get("vendor_id"),
            "quantity": quantity,
            "unit_price": unit_price,
            "total_price": total_price,
            "delivery_type": data.get("delivery_type", "home_delivery"),
            "delivery_address": data["delivery_address"],
            "scheduled_time": data.get("scheduled_time"),  # optional
            "payment_method": data["payment_method"],
            "payment_status": "pending",
            "order_status": "pending",
            "assigned_driver_id": None,
            "notes": data.get("notes", ""),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        # ✅ Insert into DB
        inserted_id = gas_orders.insert_one(order).inserted_id

        return Response({
            "message": "Order created successfully",
            "order_id": str(inserted_id),
            "total_price": total_price,
            "order_status": "pending"
        }, status=201)

    except Exception as e:
        return Response({"error": "Failed to create order", "details": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_orders(request):
    try:
        customer_id = ObjectId(request.user["_id"])
        
        orders_cursor = gas_orders.find({"customer_id": customer_id}).sort("created_at", -1)
        orders = []
        for order in orders_cursor:
            orders.append({
                "order_id": str(order["_id"]),
                "product_id": str(order["product_id"]),
                "quantity": order["quantity"],
                "total_price": order["total_price"],
                "order_status": order["order_status"],
                "delivery_address": order["delivery_address"],
                "scheduled_time": order.get("scheduled_time"),
                "payment_method": order["payment_method"],
                "notes": order.get("notes"),
                "created_at": order["created_at"]
            })
        
        return Response({"orders": orders}, status=200)

    except Exception as e:
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
@permission_classes([IsAuthenticated])
def get_user_notifications(request):
    try:
        user_id = request.user["_id"]
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
                "order_id": str(n["order_id"]) if n.get("order_id") else None,
                "read": n.get("read", False),
                "created_at": n.get("created_at")
            })

        return Response({"notifications": notif_list}, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch notifications", "details": str(e)}, status=500)







@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        user_id = request.user["_id"]

        try:
            oid = ObjectId(notification_id)
        except:
            return Response({"error": "Invalid notification ID"}, status=400)

        notif = notifications.find_one({"_id": oid, "user_id": ObjectId(user_id)})
        if not notif:
            return Response({"error": "Notification not found"}, status=404)

        notifications.update_one(
            {"_id": oid},
            {"$set": {"read": True}}
        )

        return Response({"message": "Notification marked as read"}, status=200)

    except Exception as e:
        return Response({"error": "Failed to mark notification as read", "details": str(e)}, status=500)




@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    try:
        user_id = request.user["_id"]
        unread_only = request.data.get("unread_only", True)  # default: only unread

        query = {"user_id": ObjectId(user_id)}
        if unread_only:
            query["read"] = False

        result = notifications.update_many(
            query,
            {"$set": {"read": True}}
        )

        return Response({
            "message": f"{result.modified_count} notification(s) marked as read"
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to mark notifications as read", "details": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    try:
        user = users_collection.find_one({"_id": ObjectId(request.user["_id"])}, {"password": 0, "verification_token": 0, "verification_code": 0})
        if not user:
            return Response({"error": "User not found"}, status=404)

        user["_id"] = str(user["_id"])
        return Response({"user": user}, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch profile", "details": str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    try:
        user_id = request.user["_id"]
        data = request.data
        update_fields = {}
        email_verification_needed = False

        # Update username
        if "username" in data:
            if users_collection.find_one({"username": data["username"], "_id": {"$ne": ObjectId(user_id)}}):
                return Response({"error": "Username already exists"}, status=400)
            update_fields["username"] = data["username"]

        # Update phone_number
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

            # Generate verification token/code
            import uuid, random
            from datetime import datetime, timedelta
            verification_token = str(uuid.uuid4())
            verification_code = str(random.randint(100000, 999999))
            expires_at = datetime.now() + timedelta(hours=24)

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

        # Update timestamp
        from datetime import datetime
        update_fields["updated_at"] = datetime.now().isoformat()

        # Update DB
        users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

        # Send verification email if email changed
        if email_verification_needed:
            from django.template.loader import render_to_string
            from django.core.mail import send_mail

            verification_link = f"http://localhost:8000/api/verify/?token={verification_token}"
            html_content = render_to_string('emails/verification.html', {
                'user': {"username": request.user["username"]},
                'code': verification_code,
                'link': verification_link
            })

            send_mail(
                subject=f"Verify your new email",
                message=f"Your email client does not support HTML. Verification code: {verification_code}",
                from_email="Luminan Support <support@luminan.com>",
                recipient_list=[data["email"]],
                html_message=html_content,
                fail_silently=False
            )

            return Response({"message": "Profile updated successfully. Please verify your new email."}, status=200)

        return Response({"message": "Profile updated successfully"}, status=200)

    except Exception as e:
        return Response({"error": "Failed to update profile", "details": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_new_email(request):
    try:
        token = request.data.get("token")
        if not token:
            return Response({"error": "Verification token is required"}, status=400)

        user = users_collection.find_one({"verification_token": token})
        if not user:
            return Response({"error": "Invalid or expired verification token"}, status=400)

        expires_at_str = user.get("verification_expires_at")
        if not expires_at_str or datetime.fromisoformat(expires_at_str) < datetime.now():
            return Response({"error": "Verification token has expired"}, status=400)

        # Update email
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
@permission_classes([IsAuthenticated])
def trust_app(request):
    user_type = request.data.get("user_type")  # "user" or "driver"
    user_id = request.user.get("user_id") if user_type == "user" else request.user.get("driver_id")

    if not user_id or user_type not in ["user", "driver"]:
        return Response({"error": "Invalid user_type or user_id"}, status=400)

    trust_doc = db.app_trust.find_one({"_id": "app_trust"})
    if not trust_doc:
        # Create initial document
        trust_doc = {"_id": "app_trust", "trusted_users": [], "trusted_drivers": []}
        db.app_trust.insert_one(trust_doc)

    # Check if already trusted
    key = "trusted_users" if user_type == "user" else "trusted_drivers"
    if user_id in trust_doc.get(key, []):
        return Response({"message": "You already trusted the app"}, status=200)

    # Add user_id
    db.app_trust.update_one({"_id": "app_trust"}, {"$push": {key: user_id}})

    return Response({"message": "Thank you for trusting the app"}, status=200)

























#..................................................................................................................
#Drivers Logic
#......................................................................................................................




drivers_collection = db.get_collection("drivers")
companies_collection = db.get_collection("companies")  


@api_view(['POST'])
@permission_classes([AllowAny])
def register_company(request):
    try:
        data = request.data

        # Required fields
        required_fields = ["company_name", "company_id", "company_registration_number", "email", "phone_number"]
        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        if missing_fields:
            return Response({"error": f"Missing required fields: {', '.join(missing_fields)}"}, status=400)

        # Check uniqueness
        existing_company = companies_collection.find_one({
            "$or": [
                {"company_id": data['company_id']},
                {"company_registration_number": data['company_registration_number']},
                {"email": data['email']}
            ]
        })
        if existing_company:
            return Response({"error": "Company ID, registration number, or email already exists"}, status=400)

        # Add defaults
        data.update({
            "created_at": datetime.now(),
            "status": "active"  # optional, can be used for approval workflow
        })

        # Insert into DB
        inserted_id = companies_collection.insert_one(data).inserted_id

        # Optional: send welcome email
        html_content = render_to_string('emails/company_welcome.html', {
            'company': data
        })
        send_mail(
            subject=f"Welcome to Luminan, {data['company_name']}!",
            message="Welcome to Luminan platform!",
            from_email="Luminan Support <support@luminan.com>",
            recipient_list=[data['email']],
            html_message=html_content,
            fail_silently=False
        )

        return Response({
            "message": "Company registered successfully.",
            "company_id": str(inserted_id)
        }, status=201)

    except Exception as e:
        return Response({"error": "Company registration failed", "details": str(e)}, status=500)



@api_view(['POST'])
@permission_classes([AllowAny])
def register_driver(request):
    try:
        data = request.data

        # Required fields for driver registration
        required_fields = [
            "username", "email", "phone_number", "password", "confirm_password",
            "company_id", "company_registration_number", "operation_area"
        ]
        missing_fields = [f for f in required_fields if f not in data or not data[f]]
        if missing_fields:
            return Response({"error": f"Missing required fields: {', '.join(missing_fields)}"}, status=400)

        if data['password'] != data['confirm_password']:
            return Response({"error": "Passwords do not match"}, status=400)

        # Check if company exists
        company = companies_collection.find_one({
            "company_id": data['company_id'],
            "company_registration_number": data['company_registration_number']
        })
        if not company:
            return Response({"error": "Company not found or invalid credentials"}, status=400)

        # Check driver uniqueness (username, email, phone)
        existing_driver = drivers_collection.find_one({
            "$or": [
                {"username": data['username']},
                {"email": data['email']},
                {"phone_number": data['phone_number']}
            ]
        })
        if existing_driver:
            return Response({"error": "Username, email, or phone number already exists"}, status=400)

        # Hash password
        hashed_pw = hashpw(data['password'].encode(), gensalt())
        data['password'] = hashed_pw
        data.pop('confirm_password', None)

        # Verification setup
        verification_token = str(uuid.uuid4())
        verification_code = str(random.randint(100000, 999999))
        expires_at = datetime.now() + timedelta(hours=24)

        # Add defaults
        data.update({
            "created_at": datetime.now(),
            "status": "driver",
            "verified": False,
            "verification_token": verification_token,
            "verification_code": verification_code,
            "verification_expires_at": expires_at.isoformat()
        })

        # Insert driver
        inserted_id = drivers_collection.insert_one(data).inserted_id

        # Prepare verification email
        verification_link = f"http://localhost:8000/api/driver/verify/?token={verification_token}"
        html_content = render_to_string('emails/driver_welcome.html', {
            'user': data,
            'code': verification_code,
            'link': verification_link
        })

        send_mail(
            subject=f"Welcome to Luminan, {data['username']}!",
            message=f"Your email client does not support HTML. Your verification code is: {verification_code}",
            from_email="Luminan Support <support@luminan.com>",
            recipient_list=[data['email']],
            html_message=html_content,
            fail_silently=False
        )

        return Response({
            "message": "Driver registered successfully. Please check your email to verify your account.",
            "driver_id": str(inserted_id)
        }, status=201)

    except Exception as e:
        return Response({"error": "Driver registration failed", "details": str(e)}, status=500)





def create_jwt_for_driver(driver):
    refresh = RefreshToken()
    refresh['driver_id'] = str(driver["_id"])
    refresh['username'] = driver["username"]
    refresh['status'] = driver.get("status", "driver")
    refresh['company_id'] = driver.get("company_id", "")
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token)
    }

@api_view(['POST'])
@permission_classes([AllowAny])
def login_driver(request):
    try:
        identifier = request.data.get("identifier")  # username, email, or phone
        password = request.data.get("password")

        if not identifier or not password:
            return Response({"error": "Identifier and password are required"}, status=400)

        # Find driver
        driver = drivers_collection.find_one({
            "$or": [
                {"username": identifier},
                {"email": identifier},
                {"phone_number": identifier}
            ]
        })

        if not driver:
            return Response({"error": "Invalid username/email/phone or password"}, status=401)

        # Check verified
        if not driver.get("verified", False):
            return Response({"error": "Account not verified. Please verify your account first."}, status=403)

        # Check failed login attempts
        failed_attempts = driver.get("failed_attempts", 0)
        last_failed = driver.get("last_failed_login")
        if failed_attempts >= MAX_FAILED_ATTEMPTS:
            if last_failed and datetime.now() < datetime.fromisoformat(last_failed) + timedelta(minutes=LOCKOUT_TIME_MINUTES):
                return Response({"error": "Account temporarily locked due to multiple failed login attempts. Try again later."}, status=403)

        # Check password
        if not checkpw(password.encode(), driver['password']):
            drivers_collection.update_one(
                {"_id": driver["_id"]},
                {"$inc": {"failed_attempts": 1}, "$set": {"last_failed_login": datetime.now().isoformat()}}
            )
            return Response({"error": "Invalid username/email/phone or password"}, status=401)

        # Reset failed attempts on successful login
        drivers_collection.update_one(
            {"_id": driver["_id"]},
            {"$set": {"failed_attempts": 0, "last_failed_login": None, "last_login": datetime.now().isoformat()}}
        )

        tokens = create_jwt_for_driver(driver)

        return Response({
            "message": "Login successful",
            "driver_id": str(driver["_id"]),
            "username": driver["username"],
            "status": driver.get("status", "driver"),
            "company_id": driver.get("company_id"),
            "tokens": tokens
        }, status=200)

    except Exception as e:
        return Response({"error": "Login failed", "details": str(e)}, status=500)




@api_view(['POST'])
@permission_classes([AllowAny])
def verify_driver(request):
    try:
        token = request.data.get("token")
        if not token:
            return Response({"error": "Verification token is required"}, status=400)

        driver = drivers_collection.find_one({"verification_token": token})
        if not driver:
            return Response({"error": "Invalid or expired verification token"}, status=400)

        # Mark as verified and remove token
        drivers_collection.update_one(
            {"_id": driver["_id"]},
            {"$set": {"verified": True}, "$unset": {"verification_token": "", "verification_expires_at": ""}}
        )

        return Response({"message": "Driver account verified successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Verification failed", "details": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_driver_code(request):
    try:
        code = request.data.get("code")
        if not code:
            return Response({"error": "Verification code is required"}, status=400)

        driver = drivers_collection.find_one({"verification_code": code})
        if not driver:
            return Response({"error": "Invalid verification code"}, status=400)

        # Mark as verified and remove token/code
        drivers_collection.update_one(
            {"_id": driver["_id"]},
            {"$set": {"verified": True}, "$unset": {"verification_token": "", "verification_code": "", "verification_expires_at": ""}}
        )

        return Response({"message": "Driver account verified successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Verification failed", "details": str(e)}, status=500)        






@api_view(['POST'])
@permission_classes([AllowAny])
def driver_forgot_password(request):
    email = request.data.get("email")
    if not email:
        return Response({"error": "Email is required"}, status=400)

    driver = drivers_collection.find_one({"email": email})

    # Prevent account enumeration: always respond with success
    if not driver:
        return Response({"message": "If this account exists, a reset code has been sent."}, status=200)

    # Rate-limiting
    now = datetime.now()
    last_request = driver.get("last_forgot_request")
    request_count = driver.get("forgot_request_count", 0)

    if last_request:
        last_request_dt = datetime.fromisoformat(last_request)
        if now - last_request_dt < timedelta(minutes=FORGOT_REQUEST_WINDOW_MINUTES):
            if request_count >= MAX_FORGOT_REQUESTS:
                return Response({"error": f"Too many password reset requests. Try again later."}, status=429)
        else:
            request_count = 0  # reset count after window

    # Generate 6-digit reset code
    reset_code_plain = str(random.randint(100000, 999999))
    reset_code_hashed = hashpw(reset_code_plain.encode(), gensalt())
    expires_at = now + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES)

    # Update driver document
    drivers_collection.update_one(
        {"_id": driver["_id"]},
        {"$set": {
            "reset_code": reset_code_hashed,
            "reset_code_expiry": expires_at.isoformat(),
            "last_forgot_request": now.isoformat(),
            "forgot_request_count": request_count + 1
        }}
    )

    # Send email with the plain reset code
    send_mail(
        subject="Luminan Driver Password Reset Code",
        message=f"Your password reset code is: {reset_code_plain}\nThis code expires in {RESET_CODE_EXPIRY_MINUTES} minutes.",
        from_email="Luminan Support <no-reply@luminan.com>",
        recipient_list=[email],
        fail_silently=False
    )

    return Response({"message": "If this account exists, a reset code has been sent."}, status=200)









@api_view(['POST'])
@permission_classes([AllowAny])
def driver_reset_password(request):
    try:
        code = request.data.get("code")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not all([code, new_password, confirm_password]):
            return Response({"error": "Code, new password, and confirm password are required"}, status=400)
        if new_password != confirm_password:
            return Response({"error": "Passwords do not match"}, status=400)

        # Find driver with hashed code
        driver = drivers_collection.find_one({"reset_code": {"$exists": True}})
        if not driver or not checkpw(code.encode(), driver["reset_code"]):
            return Response({"error": "Invalid or expired code"}, status=400)

        # Check expiry
        expiry_str = driver.get("reset_code_expiry")
        if not expiry_str or datetime.now() > datetime.fromisoformat(expiry_str):
            return Response({"error": "Reset code has expired"}, status=400)

        # Hash the new password
        hashed_pw = hashpw(new_password.encode(), gensalt())

        # Update driver password and remove reset code fields
        drivers_collection.update_one(
            {"_id": driver["_id"]},
            {"$set": {"password": hashed_pw}, "$unset": {"reset_code": "", "reset_code_expiry": ""}}
        )

        return Response({"message": "Password reset successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Password reset failed", "details": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_driver(request):
    try:
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token is required"}, status=400)

        # Blacklist the refresh token
        token = RefreshToken(refresh_token)
        token.blacklist()

        return Response({"message": "Driver logged out successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Logout failed", "details": str(e)}, status=500)








@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_driver_account(request):
    try:
        driver_id = request.user.driver_id  # JWT contains driver_id
        if not driver_id:
            return Response({"error": "Invalid authentication"}, status=401)

        # Delete driver account
        result = drivers_collection.delete_one({"_id": ObjectId(driver_id)})
        if result.deleted_count == 0:
            return Response({"error": "Driver not found"}, status=404)

        return Response({"message": "Driver account deleted successfully."}, status=200)

    except Exception as e:
        return Response({"error": "Account deletion failed", "details": str(e)}, status=500)





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
def assign_driver(request, order_id):
    try:
        driver_id = request.data.get("driver_id")
        if not driver_id:
            return Response({"error": "driver_id is required"}, status=400)

        # Convert IDs
        try:
            oid_order = ObjectId(order_id)
            oid_driver = ObjectId(driver_id)
        except:
            return Response({"error": "Invalid order_id or driver_id"}, status=400)

        # Fetch order
        order = gas_orders.find_one({"_id": oid_order})
        if not order:
            return Response({"error": "Order not found"}, status=404)

        # Fetch driver
        driver = drivers_collection.find_one({"_id": oid_driver})
        if not driver:
            return Response({"error": "Driver not found"}, status=404)

        # Check driver availability
        if driver.get("status") != "available":
            return Response({"error": "Driver is not available"}, status=400)

        # Update order with assigned driver
        now = datetime.now(LOCAL_TZ)
        gas_orders.update_one(
            {"_id": oid_order},
            {"$set": {"assigned_driver_id": oid_driver, "updated_at": now.isoformat()}}
        )

        # Mark driver as busy
        drivers_collection.update_one(
            {"_id": oid_driver},
            {"$set": {"status": "busy"}}
        )

        # ✅ Send notifications
        # Notify the customer
        send_notification(
            user_id=order["customer_id"],
            type_="driver_assigned",
            message=f"A driver has been assigned to your order {order_id}.",
            order_id=order_id
        )

        # Notify the driver
        send_notification(
            user_id=driver_id,
            type_="new_order",
            message=f"You have been assigned to order {order_id}.",
            order_id=order_id
        )

        return Response({
            "message": "Driver assigned successfully and notifications sent",
            "order_id": order_id,
            "driver_id": driver_id
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to assign driver", "details": str(e)}, status=500)




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
def update_payment_status(request, order_id):
    try:
        new_status = request.data.get("payment_status")
        if not new_status:
            return Response({"error": "payment_status is required"}, status=400)

        allowed_statuses = ["pending", "paid", "failed"]
        if new_status not in allowed_statuses:
            return Response({"error": f"Invalid payment_status. Allowed: {allowed_statuses}"}, status=400)

        # Convert order_id to ObjectId
        try:
            oid = ObjectId(order_id)
        except:
            return Response({"error": "Invalid order ID format"}, status=400)

        # Fetch order
        order = gas_orders.find_one({"_id": oid})
        if not order:
            return Response({"error": "Order not found"}, status=404)

        # Update payment status and timestamp
        now = datetime.now(LOCAL_TZ)
        gas_orders.update_one(
            {"_id": oid},
            {"$set": {"payment_status": new_status, "updated_at": now.isoformat()}}
        )

        # ✅ Send notification to the customer
        send_notification(
            user_id=order["customer_id"],
            type_="payment_status",
            message=f"Your payment for order {order_id} is now '{new_status}'",
            order_id=order_id
        )

        return Response({
            "message": f"Payment status updated to {new_status}",
            "order_id": order_id
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to update payment status", "details": str(e)}, status=500)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_filtered_orders(request):
    try:
        query = {}

        # Filters from query params
        status = request.GET.get("order_status")
        payment_status = request.GET.get("payment_status")
        driver_id = request.GET.get("driver_id")
        customer_id = request.GET.get("customer_id")

        if status:
            query["order_status"] = status
        if payment_status:
            query["payment_status"] = payment_status
        if driver_id:
            query["assigned_driver_id"] = ObjectId(driver_id)
        if customer_id:
            query["customer_id"] = ObjectId(customer_id)

        # Optional date range
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date or end_date:
            query["created_at"] = {}
            if start_date:
                query["created_at"]["$gte"] = start_date
            if end_date:
                query["created_at"]["$lte"] = end_date

        # Fetch orders
        orders_cursor = gas_orders.find(query).sort("created_at", -1)
        orders = []
        for order in orders_cursor:
            orders.append({
                "order_id": str(order["_id"]),
                "order_status": order["order_status"],
                "payment_status": order["payment_status"],
                "assigned_driver_id": str(order.get("assigned_driver_id")) if order.get("assigned_driver_id") else None,
                "customer_id": str(order["customer_id"]),
                "total_price": order["total_price"],
                "created_at": order["created_at"]
            })

        return Response({"orders": orders}, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch filtered orders", "details": str(e)}, status=500)     


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_driver_profile(request):
    try:
        driver = drivers_collection.find_one(
            {"_id": ObjectId(request.user["_id"])},
            {"password": 0, "verification_token": 0, "verification_code": 0}
        )
        if not driver:
            return Response({"error": "Driver not found"}, status=404)

        driver["_id"] = str(driver["_id"])
        return Response({"driver": driver}, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch profile", "details": str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_driver_profile(request):
    try:
        driver_id = request.user["_id"]
        data = request.data
        update_fields = {}
        email_verification_needed = False

        # Update username
        if "username" in data:
            if drivers_collection.find_one({"username": data["username"], "_id": {"$ne": ObjectId(driver_id)}}):
                return Response({"error": "Username already exists"}, status=400)
            update_fields["username"] = data["username"]

        # Update phone_number
        if "phone_number" in data:
            if drivers_collection.find_one({"phone_number": data["phone_number"], "_id": {"$ne": ObjectId(driver_id)}}):
                return Response({"error": "Phone number already exists"}, status=400)
            update_fields["phone_number"] = data["phone_number"]

        # Update password
        if "password" in data:
            from bcrypt import hashpw, gensalt
            hashed_pw = hashpw(data["password"].encode(), gensalt())
            update_fields["password"] = hashed_pw

        # Update email with verification
        if "email" in data:
            if drivers_collection.find_one({"email": data["email"], "_id": {"$ne": ObjectId(driver_id)}}):
                return Response({"error": "Email already exists"}, status=400)

            # Generate verification token/code
            import uuid, random
            from datetime import datetime, timedelta
            verification_token = str(uuid.uuid4())
            verification_code = str(random.randint(100000, 999999))
            expires_at = datetime.now() + timedelta(hours=24)

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

        # Update timestamp
        from datetime import datetime
        update_fields["updated_at"] = datetime.now().isoformat()

        # Update DB
        drivers_collection.update_one({"_id": ObjectId(driver_id)}, {"$set": update_fields})

        # Send verification email if email changed
        if email_verification_needed:
            from django.template.loader import render_to_string
            from django.core.mail import send_mail

            verification_link = f"http://localhost:8000/api/driver/verify/?token={verification_token}"
            html_content = render_to_string('emails/driver_welcome.html', {
                'user': {"username": request.user["username"]},
                'code': verification_code,
                'link': verification_link
            })

            send_mail(
                subject=f"Verify your new email",
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



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_driver_new_email(request):
    try:
        token = request.data.get("token")
        if not token:
            return Response({"error": "Verification token is required"}, status=400)

        driver = drivers_collection.find_one({"verification_token": token})
        if not driver:
            return Response({"error": "Invalid or expired verification token"}, status=400)

        expires_at_str = driver.get("verification_expires_at")
        from datetime import datetime
        if not expires_at_str or datetime.fromisoformat(expires_at_str) < datetime.now():
            return Response({"error": "Verification token has expired"}, status=400)

        new_email = driver.get("new_email")
        if new_email:
            drivers_collection.update_one(
                {"_id": driver["_id"]},
                {"$set": {"email": new_email, "email_verified": True},
                 "$unset": {"new_email": "", "verification_token": "", "verification_code": "", "verification_expires_at": ""}}
            )
            return Response({"message": "New email verified successfully"}, status=200)

        return Response({"error": "No email to verify"}, status=400)

    except Exception as e:
        return Response({"error": "Failed to verify email", "details": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_driver_profile_with_orders(request):
    try:
        driver_id = request.user["_id"]

        # Fetch driver profile (exclude sensitive fields)
        driver = drivers_collection.find_one(
            {"_id": ObjectId(driver_id)},
            {"password": 0, "verification_token": 0, "verification_code": 0}
        )
        if not driver:
            return Response({"error": "Driver not found"}, status=404)
        
        driver["_id"] = str(driver["_id"])

        # Optional query params
        status_filter = request.query_params.get("status")
        delivery_type_filter = request.query_params.get("delivery_type")
        search_term = request.query_params.get("search")
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 10))
        skip = (page - 1) * page_size

        # Build base query
        query = {"assigned_driver_id": ObjectId(driver_id)}
        if status_filter:
            query["order_status"] = status_filter
        if delivery_type_filter:
            query["delivery_type"] = delivery_type_filter

        # Fetch all matching orders first
        orders_cursor = gas_orders.find(query)
        orders = []

        for o in orders_cursor:
            # Attach related data for search
            customer = users_collection.find_one({"_id": o["customer_id"]}, {"username": 1, "phone_number": 1})
            product = products.find_one({"_id": o["product_id"]}, {"name": 1})

            o["_id"] = str(o["_id"])
            o["customer_id"] = str(o["customer_id"])
            o["product_id"] = str(o["product_id"])
            if o.get("assigned_driver_id"):
                o["assigned_driver_id"] = str(o["assigned_driver_id"])

            o["customer_name"] = customer.get("username") if customer else ""
            o["customer_phone"] = customer.get("phone_number") if customer else ""
            o["product_name"] = product.get("name") if product else ""

            orders.append(o)

        # Apply search filter if provided
        if search_term:
            search_term_lower = search_term.lower()
            orders = [
                o for o in orders
                if search_term_lower in o.get("customer_name", "").lower()
                or search_term_lower in o.get("customer_phone", "").lower()
                or search_term_lower in o.get("product_name", "").lower()
            ]

        # Pagination
        total_orders = len(orders)
        orders_paginated = orders[skip:skip + page_size]

        driver["assigned_orders"] = orders_paginated

        return Response({
            "driver": driver,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_orders": total_orders,
                "total_pages": (total_orders + page_size - 1) // page_size
            }
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch driver profile", "details": str(e)}, status=500)




def update_order_status_by_driver(driver_id, order_id, new_status, allowed_previous_statuses, notification_message):
    try:
        # Convert order_id
        try:
            oid = ObjectId(order_id)
        except:
            return None, {"error": "Invalid order ID format"}, 400

        # Fetch order
        order = gas_orders.find_one({"_id": oid})
        if not order:
            return None, {"error": "Order not found"}, 404

        # Check driver assignment
        if order.get("driver_id") != driver_id:
            return None, {"error": "You are not assigned to this order"}, 403

        # Check allowed status transition
        if order.get("status") not in allowed_previous_statuses:
            return None, {"error": f"Cannot change order from status '{order.get('status')}' to '{new_status}'"}, 400

        # Update status
        now = datetime.now(LOCAL_TZ)
        gas_orders.update_one(
            {"_id": oid},
            {"$set": {"status": new_status, "updated_at": now.isoformat()}}
        )

        # Send notification
        send_notification(
            user_id=order["customer_id"],
            type_="order_status",
            message=notification_message.format(order_id=order_id),
            order_id=order_id
        )

        return True, {"message": f"Order status updated to '{new_status}'", "order_id": order_id}, 200

    except Exception as e:
        return None, {"error": "Failed to update order status", "details": str(e)}, 500





@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def driver_confirm_order(request, order_id):
    driver_id = request.user.get("driver_id")
    return Response(*update_order_status_by_driver(
        driver_id,
        order_id,
        new_status="confirmed",
        allowed_previous_statuses=["pending", "assigned"],
        notification_message="Your order {order_id} has been confirmed by the driver."
    ))

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def driver_pickup_order(request, order_id):
    driver_id = request.user.get("driver_id")
    return Response(*update_order_status_by_driver(
        driver_id,
        order_id,
        new_status="picked_up",
        allowed_previous_statuses=["confirmed"],
        notification_message="Your order {order_id} has been picked up by the driver."
    ))

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def driver_deliver_order(request, order_id):
    driver_id = request.user.get("driver_id")
    return Response(*update_order_status_by_driver(
        driver_id,
        order_id,
        new_status="delivered",
        allowed_previous_statuses=["picked_up"],
        notification_message="Your order {order_id} has been delivered by the driver."
    ))

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def driver_cancel_order(request, order_id):
    driver_id = request.user.get("driver_id")
    return Response(*update_order_status_by_driver(
        driver_id,
        order_id,
        new_status="canceled",
        allowed_previous_statuses=["pending", "assigned", "confirmed", "picked_up"],
        notification_message="Your order {order_id} has been canceled by the driver."
    ))



@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_driver_location(request):
    try:
        driver_id = request.user.get("driver_id")
        if not driver_id:
            return Response({"error": "Driver ID not found in token"}, status=403)

        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")

        if latitude is None or longitude is None:
            return Response({"error": "Both latitude and longitude are required"}, status=400)

        try:
            latitude = float(latitude)
            longitude = float(longitude)
        except ValueError:
            return Response({"error": "Latitude and longitude must be numbers"}, status=400)

        # Update location in the driver document
        now = datetime.now(LOCAL_TZ)
        drivers_collection.update_one(
            {"_id": ObjectId(driver_id)},
            {"$set": {
                "current_location": {"latitude": latitude, "longitude": longitude},
                "location_updated_at": now.isoformat()
            }}
        )

        return Response({
            "message": "Location updated successfully",
            "location": {"latitude": latitude, "longitude": longitude},
            "updated_at": now.isoformat()
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to update location", "details": str(e)}, status=500)




@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def driver_accept_reject_order(request, order_id):
    try:
        driver_id = request.user.get("driver_id")
        if not driver_id:
            return Response({"error": "Driver ID not found in token"}, status=403)

        action = request.data.get("action")
        if action not in ["accept", "reject"]:
            return Response({"error": "Invalid action. Must be 'accept' or 'reject'."}, status=400)

        # Convert order_id
        try:
            oid = ObjectId(order_id)
        except:
            return Response({"error": "Invalid order ID format"}, status=400)

        # Fetch order
        order = gas_orders.find_one({"_id": oid})
        if not order:
            return Response({"error": "Order not found"}, status=404)

        # Check if this driver is assigned
        if order.get("driver_id") != driver_id:
            return Response({"error": "You are not assigned to this order"}, status=403)

        # Only allow action if order is assigned
        if order.get("status") != "assigned":
            return Response({"error": f"Cannot accept/reject order in status '{order.get('status')}'"}, status=400)

        now = datetime.now(LOCAL_TZ)

        if action == "accept":
            new_status = "confirmed"
            message = f"Your order {order_id} has been accepted by the driver."
        else:
            new_status = "unassigned"  # driver rejected, back to pool
            message = f"Your order {order_id} was rejected by the driver. Reassigning..."
            # Optionally, remove driver assignment
            gas_orders.update_one({"_id": oid}, {"$unset": {"driver_id": ""}})

        # Update order status
        gas_orders.update_one(
            {"_id": oid},
            {"$set": {"status": new_status, "updated_at": now.isoformat()}}
        )

        # Notify customer
        send_notification(
            user_id=order["customer_id"],
            type_="order_status",
            message=message,
            order_id=order_id
        )

        return Response({
            "message": f"Order {action}ed successfully",
            "order_id": order_id,
            "new_status": new_status
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to process action", "details": str(e)}, status=500)






@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_driver_availability(request):
    try:
        driver_id = request.user.get("driver_id")
        if not driver_id:
            return Response({"error": "Driver ID not found in token"}, status=403)

        status = request.data.get("status")
        if status not in ["available", "unavailable"]:
            return Response({"error": "Invalid status. Must be 'available' or 'unavailable'."}, status=400)

        now = datetime.now(LOCAL_TZ)

        # Update driver document
        drivers_collection.update_one(
            {"_id": ObjectId(driver_id)},
            {"$set": {
                "availability_status": status,
                "availability_updated_at": now.isoformat()
            }}
        )

        return Response({
            "message": f"Availability updated to '{status}'",
            "status": status,
            "updated_at": now.isoformat()
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to update availability", "details": str(e)}, status=500)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def driver_dashboard(request):
    try:
        driver_id = request.user.get("driver_id")
        if not driver_id:
            return Response({"error": "Driver ID not found in token"}, status=403)

        driver = drivers_collection.find_one({"_id": ObjectId(driver_id)}, {"password": 0})
        if not driver:
            return Response({"error": "Driver not found"}, status=404)

        # Current location and availability
        location = driver.get("current_location", {})
        availability = driver.get("availability_status", "unavailable")

        # Assigned orders (status: pending, confirmed, picked_up)
        assigned_orders = list(gas_orders.find({
            "driver_id": driver_id,
            "status": {"$in": ["assigned", "confirmed", "picked_up"]}
        }))

        # Format orders
        orders_list = []
        for order in assigned_orders:
            orders_list.append({
                "order_id": str(order["_id"]),
                "status": order.get("status"),
                "customer_id": order.get("customer_id"),
                "address": order.get("delivery_address"),
                "payment_status": order.get("payment_status"),
                "created_at": order.get("created_at"),
                "updated_at": order.get("updated_at")
            })

        # Optional: last 5 completed/canceled orders
        history_orders = list(gas_orders.find({
            "driver_id": driver_id,
            "status": {"$in": ["delivered", "canceled"]}
        }).sort("updated_at", -1).limit(5))

        history_list = []
        for order in history_orders:
            history_list.append({
                "order_id": str(order["_id"]),
                "status": order.get("status"),
                "customer_id": order.get("customer_id"),
                "address": order.get("delivery_address"),
                "payment_status": order.get("payment_status"),
                "updated_at": order.get("updated_at")
            })

        return Response({
            "driver": {
                "driver_id": driver_id,
                "username": driver.get("username"),
                "company_id": driver.get("company_id"),
                "availability": availability,
                "location": location,
            },
            "assigned_orders": orders_list,
            "recent_history": history_list
        }, status=200)

    except Exception as e:
        return Response({"error": "Failed to fetch dashboard", "details": str(e)}, status=500)
