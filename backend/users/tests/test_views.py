import pytest
import uuid
import json
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

from users.models import VerificationToken, PasswordResetToken

User = get_user_model()

# ------------------- Fixtures -------------------

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user_data():
    return {
        'email': 'test@example.com',
        'password': 'StrongPassword123!',
        'first_name': 'Test',
        'last_name': 'User'
    }

@pytest.fixture
def create_user(db):
    def make_user(email='user@example.com', password='password123', is_verified=False):
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name='Test',
            last_name='User',
            is_verified=is_verified
        )
        return user
    return make_user

@pytest.fixture
def verified_user(create_user):
    return create_user(email='verified@example.com', is_verified=True)

@pytest.fixture
def unverified_user(create_user):
    return create_user(email='unverified@example.com', is_verified=False)

@pytest.fixture
def verification_token(db, unverified_user):
    token = VerificationToken.objects.create(user=unverified_user)
    return token

@pytest.fixture
def password_reset_token(db, verified_user):
    token = PasswordResetToken.objects.create(user=verified_user)
    return token

# ------------------- Registration Tests -------------------

@pytest.mark.django_db
class TestUserRegistrationView:
    url = reverse('register')  # Update with your actual URL name
    
    @patch('users.views.send_verification_email')
    def test_user_registration_success(self, mock_send_email, api_client, user_data):
        """Test successful user registration"""
        response = api_client.post(self.url, user_data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'message' in response.data
        assert User.objects.filter(email=user_data['email']).exists()
        assert VerificationToken.objects.filter(user__email=user_data['email']).exists()
        mock_send_email.assert_called_once()
    
    def test_user_registration_invalid_email(self, api_client):
        """Test registration with invalid email"""
        data = {
            'email': 'invalid-email',
            'password': 'StrongPassword123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data
    
    def test_user_registration_weak_password(self, api_client):
        """Test registration with weak password"""
        data = {
            'email': 'test@example.com',
            'password': '123',  # Too short/simple
            'first_name': 'Test',
            'last_name': 'User'
        }
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data
    
    def test_user_registration_duplicate_email(self, api_client, create_user, user_data):
        """Test registration with existing email"""
        # Create a user with the same email
        create_user(email=user_data['email'])
        
        response = api_client.post(self.url, user_data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data

# ------------------- Login Tests -------------------

@pytest.mark.django_db
class TestUserLoginView:
    url = reverse('login')  # Update with your actual URL name
    
    def test_login_success(self, api_client, verified_user):
        """Test successful login"""
        data = {
            'email': 'verified@example.com',
            'password': 'password123'
        }
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        assert 'user' in response.data
        assert 'session_id' in response.data
    
    def test_login_unverified_user(self, api_client, unverified_user):
        """Test login with unverified user"""
        data = {
            'email': 'unverified@example.com',
            'password': 'password123'
        }
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'error' in response.data
        assert 'verify' in response.data['error'].lower()
    
    def test_login_invalid_credentials(self, api_client, verified_user):
        """Test login with wrong password"""
        data = {
            'email': 'verified@example.com',
            'password': 'wrongpassword'
        }
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'error' in response.data
    
    def test_login_get_with_session(self, api_client, verified_user):
        """Test GET request with active session"""
        # First login to create a session
        api_client.force_login(verified_user)
        
        response = api_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'user' in response.data
        assert 'csrf' in response.data
    
    def test_login_get_without_session(self, api_client):
        """Test GET request without session"""
        response = api_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'detail' in response.data
        assert 'No session ID provided' in response.data['detail']

# ------------------- Email Verification Tests -------------------

@pytest.mark.django_db
class TestVerifyEmailView:
    def get_url(self, token):
        return reverse('verify-email', kwargs={'token': token})  # Update with your actual URL name
    
    def test_verify_email_success(self, api_client, verification_token):
        """Test successful email verification"""
        url = self.get_url(verification_token.token)
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        
        # Refresh user from database
        user = User.objects.get(pk=verification_token.user.pk)
        assert user.is_verified
        
        # Token should be deleted
        assert not VerificationToken.objects.filter(token=verification_token.token).exists()
    
    def test_verify_email_invalid_token(self, api_client):
        """Test verification with invalid token"""
        url = self.get_url(uuid.uuid4())
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

@pytest.mark.django_db
class TestResendVerificationEmailView:
    url = reverse('resend_verification')  # Update with your actual URL name
    
    @patch('users.views.send_verification_email')
    def test_resend_verification_success(self, mock_send_email, api_client, unverified_user):
        """Test successful resend verification"""
        data = {'email': unverified_user.email}
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        assert VerificationToken.objects.filter(user=unverified_user).exists()
        mock_send_email.assert_called_once()
    
    def test_resend_verification_already_verified(self, api_client, verified_user):
        """Test resend verification for already verified user"""
        data = {'email': verified_user.email}
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
        assert 'already verified' in response.data['error'].lower()
    
    def test_resend_verification_nonexistent_email(self, api_client):
        """Test resend verification for non-existent email"""
        data = {'email': 'nonexistent@example.com'}
        response = api_client.post(self.url, data, format='json')
        
        # Should still return 200 for security reasons
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
    
    def test_resend_verification_no_email(self, api_client):
        """Test resend verification without email"""
        response = api_client.post(self.url, {}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

@pytest.mark.django_db
class TestVerifyAndLoginView:
    def get_url(self, token):
        return reverse('verify-and-login', kwargs={'token': token})  # Update with your actual URL name
    
    def test_verify_and_login_success(self, api_client, verification_token):
        """Test successful verification and login"""
        url = self.get_url(verification_token.token)
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        assert 'token' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
        
        # Refresh user from database
        user = User.objects.get(pk=verification_token.user.pk)
        assert user.is_verified
        
        # Token should be deleted
        assert not VerificationToken.objects.filter(token=verification_token.token).exists()
    
    def test_verify_and_login_invalid_token(self, api_client):
        """Test verification and login with invalid token"""
        url = self.get_url(uuid.uuid4())
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

# ------------------- Password Reset Tests -------------------

@pytest.mark.django_db
class TestForgotPasswordView:
    url = reverse('forgot-password')  # Update with your actual URL name
    
    @patch('users.views.send_forgot_password_email')
    def test_forgot_password_existing_email(self, mock_send_email, api_client, verified_user):
        """Test forgot password with existing email"""
        data = {'email': verified_user.email}
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        assert PasswordResetToken.objects.filter(user=verified_user).exists()
        mock_send_email.assert_called_once()
    
    def test_forgot_password_nonexistent_email(self, api_client):
        """Test forgot password with non-existent email"""
        data = {'email': 'nonexistent@example.com'}
        response = api_client.post(self.url, data, format='json')
        
        # Should still return 200 for security reasons
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
    
    def test_forgot_password_no_email(self, api_client):
        """Test forgot password without email"""
        response = api_client.post(self.url, {}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

@pytest.mark.django_db
class TestResetPasswordView:
    url = reverse('reset-password')  # Update with your actual URL name
    
    def test_reset_password_success(self, api_client, verified_user, password_reset_token):
        """Test successful password reset"""
        uidb64 = urlsafe_base64_encode(force_bytes(verified_user.pk))
        data = {
            'uidb64': uidb64,
            'token': str(password_reset_token.token),
            'password': 'NewStrongPassword123!',
            'confirm_password': 'NewStrongPassword123!'
        }
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        
        # Token should be deleted
        assert not PasswordResetToken.objects.filter(token=password_reset_token.token).exists()
        
        # User should be able to login with new password
        user = User.objects.get(pk=verified_user.pk)
        assert user.check_password('NewStrongPassword123!')
    
    def test_reset_password_invalid_token(self, api_client, verified_user):
        """Test password reset with invalid token"""
        uidb64 = urlsafe_base64_encode(force_bytes(verified_user.pk))
        data = {
            'uidb64': uidb64,
            'token': str(uuid.uuid4()),
            'password': 'NewStrongPassword123!',
            'confirm_password': 'NewStrongPassword123!'
        }
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data
    
    def test_reset_password_invalid_user(self, api_client, password_reset_token):
        """Test password reset with invalid user"""
        uidb64 = urlsafe_base64_encode(force_bytes(999))  # Non-existent user ID
        data = {
            'uidb64': uidb64,
            'token': str(password_reset_token.token),
            'password': 'NewStrongPassword123!',
            'confirm_password': 'NewStrongPassword123!'
        }
        response = api_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

# ------------------- User Profile Tests -------------------

@pytest.mark.django_db
class TestUserProfileView:
    url = reverse('profile')  # Update with your actual URL name
    
    def test_get_profile_authenticated(self, api_client, verified_user):
        """Test getting profile when authenticated"""
        api_client.force_authenticate(user=verified_user)
        response = api_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == verified_user.email
        assert response.data['first_name'] == verified_user.first_name
        assert response.data['last_name'] == verified_user.last_name
    
    def test_get_profile_unauthenticated(self, api_client):
        """Test getting profile when not authenticated"""
        response = api_client.get(self.url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_update_profile(self, api_client, verified_user):
        """Test updating profile"""
        api_client.force_authenticate(user=verified_user)
        data = {
            'first_name': 'Updated',
            'last_name': 'Name'
        }
        response = api_client.patch(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == 'Updated'
        assert response.data['last_name'] == 'Name'
        
        # Refresh user from database
        user = User.objects.get(pk=verified_user.pk)
        assert user.first_name == 'Updated'
        assert user.last_name == 'Name'

# ------------------- Become Host Tests -------------------

@pytest.mark.django_db
class TestBecomeHostView:
    url = reverse('become-host')  # Update with your actual URL name
    
    def test_become_host_success(self, api_client, verified_user):
        """Test successful become host request"""
        api_client.force_authenticate(user=verified_user)
        response = api_client.post(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        assert 'user' in response.data
        
        # Refresh user from database
        user = User.objects.get(pk=verified_user.pk)
        assert user.can_list_driveway
    
    def test_become_host_unauthenticated(self, api_client):
        """Test become host when not authenticated"""
        response = api_client.post(self.url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

# ------------------- User Delete Tests -------------------

@pytest.mark.django_db
class TestUserDeleteView:
    def get_url(self, user_id):
        return reverse('user_delete', kwargs={'pk': user_id})  # Update with your actual URL name
    
    def test_delete_own_account(self, api_client, verified_user):
        """Test deleting own account"""
        api_client.force_authenticate(user=verified_user)
        url = self.get_url(verified_user.id)
        response = api_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not User.objects.filter(pk=verified_user.pk).exists()
    
    def test_delete_other_account(self, api_client, verified_user, create_user):
        """Test deleting someone else's account"""
        other_user = create_user(email='other@example.com')
        api_client.force_authenticate(user=verified_user)
        url = self.get_url(other_user.id)
        response = api_client.delete(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert User.objects.filter(pk=other_user.pk).exists()
    
    def test_delete_unauthenticated(self, api_client, verified_user):
        """Test deleting account when not authenticated"""
        url = self.get_url(verified_user.id)
        response = api_client.delete(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert User.objects.filter(pk=verified_user.pk).exists()

# ------------------- Logout Tests -------------------

@pytest.mark.django_db
class TestUserLogoutView:
    url = reverse('logout')  # Update with your actual URL name
    
    def test_logout_authenticated(self, api_client, verified_user):
        """Test logout when authenticated"""
        api_client.force_login(verified_user)
        response = api_client.post(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        
        # Check response headers
        assert 'Cache-Control' in response
        assert 'X-Logout-Completed' in response
    
    def test_logout_unauthenticated(self, api_client):
        """Test logout when not authenticated"""
        response = api_client.post(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data