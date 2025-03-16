from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils.decorators import method_decorator
from .serializers import UserRegistrationSerializer, UserLoginSerializer, UserProfileSerializer
import logging

# Set up logging
logger = logging.getLogger(__name__)

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        logger.info("Received registration data: %s", request.data)
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Here you would typically send a verification email
            # For now, we'll just mark the user as verified
            user.is_verified = True
            user.save()
            
            return Response(
                {"message": "User registered successfully"}, 
                status=status.HTTP_201_CREATED
            )
        logger.error("Validation errors: %s", serializer.errors)
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

