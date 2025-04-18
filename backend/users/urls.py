from django.urls import path
from .views import UserRegistrationView, UserLoginView, UserLogoutView, UserProfileView, VerifyEmailView, ForgotPasswordView, ResetPasswordView, BecomeHostView, UserDeleteView, ResendVerificationEmailView, VerifyAndLoginView

urlpatterns = [
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('verify-email/<uuid:token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('become-host/', BecomeHostView.as_view(), name='become-host'),
    path('users/<int:pk>/', UserDeleteView.as_view(), name='user_delete'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend_verification'),
    path('verify-and-login/<uuid:token>/', VerifyAndLoginView.as_view(), name='verify-and-login')
]