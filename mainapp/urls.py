# urls.py
from django.urls import path
from .views import register_user, login_user, get_profile, verify_account,verify_account_code, forgot_password, reset_password


urlpatterns = [
    path('api/register/', register_user, name='register_user'),
    path('api/login/', login_user, name="login"),
    path("api/profile/", get_profile, name="profile"),
    path("api/verify/", verify_account, name="verify_account"),
    path("api/verify-code/", verify_account_code, name="verify_account_code"),
    path("api/forgot-password/", forgot_password, name="forgot_password"),
    path("api/reset-password/", reset_password, name="reset_password"),
     
]
