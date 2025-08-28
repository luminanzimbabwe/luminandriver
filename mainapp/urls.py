from django.urls import path
from .views import (
    register_user,
    login_user,
    get_profile,
    verify_account,
    verify_account_code,
    forgot_password,
    reset_password,
    logout_user,
    delete_account,
    register_driver,
    register_company,
    login_driver,
    verify_driver,
    verify_driver_code,
    driver_forgot_password,
    driver_reset_password,
    delete_driver_account,
    logout_driver,
    create_gas_order,
    list_user_orders,
    get_order_detail,
    cancel_order,
    assign_driver,
    update_payment_status,
    list_filtered_orders,
    get_user_notifications,
    mark_notification_read,
    mark_all_notifications_read,
    get_user_profile,
    update_user_profile,
    verify_new_email,
    get_driver_profile,
    update_driver_profile,
    verify_driver_new_email,
    get_driver_profile_with_orders,
    driver_confirm_order,
    driver_pickup_order,
    driver_deliver_order,
    driver_cancel_order,
    update_driver_location,
    driver_accept_reject_order,
    update_driver_availability,
    driver_dashboard,
    trust_app,
    get_trust_count,
    

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

    path('orders/create/', create_gas_order, name='create_gas_order'),

    path('orders/my-orders/', list_user_orders, name='list_user_orders'),
    path('orders/<str:order_id>/', get_order_detail, name='get_order_detail'),
    path('orders/<str:order_id>/cancel/', cancel_order, name='cancel_order'),

    # Fetch all notifications (or only unread)
    path('notifications/', get_user_notifications, name='get_user_notifications'),

    # Mark a notification as read
    path('notifications/<str:notification_id>/read/', mark_notification_read, name='mark_notification_read'),

    path('notifications/mark-all-read/', mark_all_notifications_read, name='mark_all_notifications_read'),
    path('profile/', get_user_profile, name='get_user_profile'),
    path('profile/update/', update_user_profile, name='update_user_profile'),
    path('profile/verify-new-email/', verify_new_email, name='verify_new_email'),







    # Drivers logic urls

    # Company registration
    path('api/company/register/', register_company, name='register_company'),

    # Driver registration
    path('api/driver/register/', register_driver, name='register_driver'),

     # Driver login
    path('api/driver/login/', login_driver, name='login_driver'),


     # Driver verification by token
    path('api/driver/verify/', verify_driver, name='verify_driver'),

    # Driver verification by code
    path('api/driver/verify-code/', verify_driver_code, name='verify_driver_code'),

     # Driver forgot password
    path('api/driver/forgot-password/', driver_forgot_password, name='driver_forgot_password'),

    # Driver reset password
    path('api/driver/reset-password/', driver_reset_password, name='driver_reset_password'),


    path('api/driver/logout/', logout_driver, name='logout_driver'),


    path('api/driver/delete-account/', delete_driver_account, name='delete_driver_account'),
    path('orders/<str:order_id>/assign-driver/', assign_driver, name='assign_driver'),
    path('orders/<str:order_id>/update-payment/', update_payment_status, name='update_payment_status'),
    path('orders/filter/', list_filtered_orders, name='list_filtered_orders'),

    path('driver/profile/', get_driver_profile, name='get_driver_profile'),
    path('driver/profile/update/', update_driver_profile, name='update_driver_profile'),
    path('driver/profile/verify-new-email/', verify_driver_new_email, name='verify_driver_new_email'),
    path('driver/profile/', get_driver_profile_with_orders, name='get_driver_profile_with_orders'),
    path('driver/orders/<str:order_id>/confirm/', driver_confirm_order, name='driver_confirm_order'),
    path('driver/orders/<str:order_id>/pickup/', driver_pickup_order, name='driver_pickup_order'),
    path('driver/orders/<str:order_id>/deliver/', driver_deliver_order, name='driver_deliver_order'),
    path('driver/orders/<str:order_id>/cancel/', driver_cancel_order, name='driver_cancel_order'),
    path('driver/location/update/', update_driver_location, name='update_driver_location'),
    path('driver/orders/<str:order_id>/accept/', driver_accept_reject_order, name='driver_accept_reject_order'),
    path('driver/availability/', update_driver_availability, name='update_driver_availability'), 
    path('driver/dashboard/', driver_dashboard, name='driver_dashboard'),
    path('app/trust/', trust_app, name='trust_app'),
    path('app/trust/count/', get_trust_count, name='get_trust_count'),


]
