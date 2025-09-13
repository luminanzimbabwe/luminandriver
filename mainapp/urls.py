from django.urls import path
from .views import (
    register_user,
    login_user,
    get_profile,
    set_price_per_kg,
    verify_account,
    verify_account_code,
    forgot_password,
    reset_password,
    logout_user,
    delete_account,
  
    create_gas_order,
    list_user_orders,
    get_order_detail,
    cancel_order,
    assign_driver,
   
    get_user_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    get_user_profile,
    update_user_profile,
    verify_new_email,
    register_driver,
    login_driver,
    driver_assigned_orders,
    list_all_drivers,
    mark_delivered,
    confirm_order,
)

urlpatterns = [
    # -----------------
    # Authentication
    # -----------------
    path('api/register/', register_user, name='register_user'),
    path('api/login/', login_user, name='login'),
    path('api/logout/', logout_user, name='logout_user'),

    # -----------------
    # Profile
    # -----------------
    path("api/profile/", get_profile, name="profile"),
    path('profile/', get_user_profile, name='get_user_profile'),
    path('profile/update/', update_user_profile, name='update_user_profile'),
    path('profile/verify-new-email/', verify_new_email, name='verify_new_email'),

    # -----------------
    # Account Verification
    # -----------------
    path("api/verify/", verify_account, name="verify_account"),
    path("api/verify-code/", verify_account_code, name="verify_account_code"),

    # -----------------
    # Password Recovery
    # -----------------
    path("api/forgot-password/", forgot_password, name="forgot_password"),
    path("api/reset-password/", reset_password, name="reset_password"),

    # -----------------
    # Account Management
    # -----------------
    path("api/delete-account/", delete_account, name="delete_account"),

    # -----------------
    # Gas Orders
    # -----------------
    path('orders/create/', create_gas_order, name='create_gas_order'),
    path('orders/assign/<str:order_id>/', assign_driver, name='assign_driver'),
    path('orders/my-orders/', list_user_orders, name='list_user_orders'),
    path('orders/<str:order_id>/', get_order_detail, name='get_order_detail'),
    path('orders/<str:order_id>/cancel/', cancel_order, name='cancel_order'),

    # -----------------
    # Notifications
    # -----------------
    path('notifications/', get_user_notifications, name='get_user_notifications'),
    path('notifications/<str:notification_id>/read/', mark_notification_read, name='mark_notification_read'),
    path('notifications/mark-all-read/', mark_all_notifications_read, name='mark_all_notifications_read'),

    # -----------------
    # Driver Routes
    # -----------------
    path('driver/register/', register_driver, name='driver-register'),
    path('driver/login/', login_driver, name='driver-login'),
    path('driver/orders/', driver_assigned_orders, name='driver-orders'),  # GET assigned orders
    path('driver/orders/<str:order_id>/confirm/', confirm_order, name='confirm-order'),
    path('driver/orders/<str:order_id>/cancel/', cancel_order, name='cancel-order'),
    path('driver/orders/<str:order_id>/delivered/', mark_delivered, name='mark-delivered'),
    path('drivers/list/', list_all_drivers, name='list-all-drivers'),
    path('drivers/set-price/', set_price_per_kg, name='set_price_per_kg'),

]
