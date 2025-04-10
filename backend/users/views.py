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
from .models import VerificationToken, User
from .util.email import send_verification_email, send_forgot_password_email
from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer, ResetPasswordSerializer
import logging
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from rest_framework.exceptions import ValidationError
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.tokens import default_token_generator
from .models import PasswordResetToken
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

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
        # Attempt to retrieve user information based on the session ID
        if request.session.session_key:
            try:
                user_id = request.session['_auth_user_id']
                user = User.objects.get(pk=user_id)
                serializer = UserProfileSerializer(user)
                return Response({
                    "detail": "User info retrieved from session",
                    "user": serializer.data,
                    "csrf": get_token(request)  # Also return CSRF token
                })
            except User.DoesNotExist:
                # If user does not exist, return a message
                return Response({
                    "detail": "No user found for this session",
                    "csrf": get_token(request)
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # If no session ID is present, return a message
            return Response({
                "detail": "No session ID provided",
                "csrf": get_token(request)
            }, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        logger.info("Login attempt with data: %s", request.data)
        logger.info("Request headers: %s", request.headers)

        serializer = UserLoginSerializer(data=request.data)
        logger.info(serializer)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            logger.info("Attempting to authenticate user: %s", email)
            user = authenticate(request, email=email, password=password)

            logger.warning(user)

            if user is not None:
                if not user.is_verified:
                        logger.warning("Login attempt by unverified user: %s", email)
                        return Response(
                            {"error": "Please verify your email address before logging in"},
                            status=status.HTTP_403_FORBIDDEN
                        )
                # Log session information before login
                logger.info("Session before login: %s", request.session.session_key)

                # This is the key part - login() creates the session
                login(request, user)

                # Set session expiry (optional) - 2 weeks
                request.session.set_expiry(1209600)

                # Ensure the session is saved
                request.session.save()

                # Log session information after login
                logger.info("User logged in successfully: %s", email)
                logger.info("Session after login: %s", request.session.session_key)
                logger.info("Session data: %s", dict(request.session))

                return Response({
                    "message": "Login successful",
                    "user": UserProfileSerializer(user).data,
                    "session_id": request.session.session_key  # Include session ID for debugging
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
            password_reset_token = PasswordResetToken.objects.create(user=user)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            send_forgot_password_email(user, uidb64, password_reset_token)

            return Response({"message": "If an account with that email exists, a password reset link has been sent."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"message": "If an account with that email exists, a password reset link has been sent."}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            uidb64 = request.data.get('uidb64')
            token = request.data.get('token')
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None:
            serializer = ResetPasswordSerializer(data=request.data)
            if serializer.is_valid(raise_exception=True):
                password = serializer.validated_data['password']
                try:
                    password_reset_token = PasswordResetToken.objects.get(user=user, token=token)
                except PasswordResetToken.DoesNotExist:
                    return Response({"error": "Invalid reset password token."}, status=status.HTTP_400_BAD_REQUEST)
                user.set_new_password(password)
                password_reset_token.delete()
                return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": "User not found."}, status=status.HTTP_400_BAD_REQUEST)


class UserLogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Log session information before logout
        logger.info("Logout request received")
    
        # Check if user is authenticated before accessing user object
        if request.user.is_authenticated:
            logger.info("Logout request for user: %s", request.user)
            logger.info("Session before logout: %s", request.session.session_key)
        
            # Get the session key before logout for debugging
            session_key_before = request.session.session_key
        
            # Django's logout function clears the session
            logout(request)
        else:
            logger.info("Logout request for unauthenticated user")
    
        # Explicitly clear the session
        if hasattr(request, 'session'):
            request.session.flush()
            
        # Create response
        response = Response({"message": "Logout successful"})
        
        # Explicitly delete cookies with proper settings - try multiple variations
        response.delete_cookie('sessionid', path='/', domain=None)
        response.delete_cookie('csrftoken', path='/', domain=None)
        response.delete_cookie('sessionid', path='')
        response.delete_cookie('csrftoken', path='')
        response.delete_cookie('sessionid')
        response.delete_cookie('csrftoken')
        
        # Set cache control headers
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        
        # Add a header to signal this is a logout response
        response['X-Logout-Completed'] = 'true'
        
        # Log session information after logout
        logger.info("Session after logout: %s", getattr(request, 'session', {}).get('session_key', None))
        
        return response


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Log session information for debugging
        logger.info("Profile request for user: %s", request.user)
        logger.info("Session key: %s", request.session.session_key)
        
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class BecomeHostView(APIView):
    """
    API endpoint that allows users to become hosts by setting can_list_driveway to True.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.info("BecomeHostView: Request received")
        logger.info(f"BecomeHostView: Headers: {dict(request.headers)}")
        logger.info(f"BecomeHostView: Cookies: {request.COOKIES}")
        
        # Check if user is authenticated
        if not request.user.is_authenticated:
            logger.warning("BecomeHostView: User is not authenticated")
            return Response({
                "error": "Authentication required"
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Get the user from the request
            user = request.user
            logger.info(f"BecomeHostView: User {user.email}")
            
            # Update the user's can_list_driveway attribute
            user.can_list_driveway = True
            user.save()
            
            # Verify the change was saved
            user.refresh_from_db()
            logger.info(f"BecomeHostView: Updated can_list_driveway value: {user.can_list_driveway}")
            
            logger.info(f"User {user.email} became a host")
            
            serializer = UserProfileSerializer(user)
            return Response({
                "message": "You are now a host and can list driveways",
                "user": serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"BecomeHostView: Error occurred: {str(e)}", exc_info=True)
            return Response({
                "error": "An error occurred while processing your request"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserDeleteView(APIView):
    """
    API endpoint that allows users to delete their own account.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if str(request.user.id) != str(pk):
            return Response(
                {"error": "You do not have permission to delete this account."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = request.user
            
            user.delete()
            
            return Response(
                {"message": "Account successfully deleted."},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            logger.error(f"Error deleting user account: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while deleting your account."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ResendVerificationEmailView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            user = User.objects.get(email=email)
            

            if user.is_verified:
                return Response(
                    {"error": "This account is already verified"},
                    status=status.HTTP_400_BAD_REQUEST
                )
  
            VerificationToken.objects.filter(user=user).delete()

            verification_token = VerificationToken.objects.create(user=user)

            send_verification_email(user, verification_token)
            
            logger.info(f"Verification email resent to: {email}")
            
            return Response(
                {"message": "Verification email sent successfully"},
                status=status.HTTP_200_OK
            )
            
        except User.DoesNotExist:

            logger.warning(f"Resend verification attempt for non-existent user: {email}")
            return Response(
                {"message": "If this email exists in our system, a verification link has been sent"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error sending verification email: {str(e)}")
            return Response(
                {"error": "Failed to send verification email"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )