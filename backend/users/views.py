from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils.decorators import method_decorator
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from .models import VerificationToken
from .util.email import send_verification_email,  send_forgot_password_email
from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer
import logging
from django.contrib.auth import get_user_model

User = get_user_model()

# Set up logging
logger = logging.getLogger(__name__)


class UserRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Received registration data: %s", request.data)
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
            # Start a transaction block
                with transaction.atomic():
                    user = serializer.save()
                    user.save()

                    # Create verification token
                    verification_token = VerificationToken.objects.create(user=user)

                    # Send verification email
                    send_verification_email(user, verification_token)
            
                return Response(
                    {"message": "User registered successfully. Please check your email to verify your account."},
                    status=status.HTTP_201_CREATED
                )
            
            except Exception as e:
                # In case of any error, log it and return a failure response
                logger.error(f"Error during registration: {e}")
                return Response({"error": "An error occurred during registration. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Add CSRF exemption for development - remove in production
@method_decorator(csrf_exempt, name='dispatch')
class UserLoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # This endpoint is just for setting the CSRF cookie
        return Response({"detail": "CSRF cookie set"})

    def post(self, request):
        logger.info("Login attempt with data: %s", request.data)
        logger.info("Request headers: %s", request.headers)

        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            logger.info("Attempting to authenticate user: %s", email)
            user = authenticate(request, email=email, password=password)

            if user is not None:
                login(request, user)
                logger.info("User logged in successfully: %s", email)
                return Response({
                    "message": "Login successful",
                    "user": UserProfileSerializer(user).data
                })
            else:
                logger.warning("Invalid credentials for user: %s", email)
                return Response(
                    {"error": "Invalid credentials"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        logger.error("Login validation errors: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            verification_token = VerificationToken.objects.get(token=token)
            user = verification_token.user
            if not user.is_verified:
                user.is_verified = True
                user.save()
            verification_token.delete()  # Delete the token after successful verification
            return Response({"message": "Email verified successfully. Please login."}, status=status.HTTP_200_OK)
        except VerificationToken.DoesNotExist:
            return Response({"error": "Invalid verification token."}, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)

            send_forgot_password_email(user)

            return Response({"message": "Password reset email sent successfully."}, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({"message": "If an account with that email exists, a password reset link has been sent."}, status=status.HTTP_200_OK)


class UserLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"message": "Logout successful"})


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

