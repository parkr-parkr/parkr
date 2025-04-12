import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ErrorDetail
from users.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    ResetPasswordSerializer,
    UserProfileSerializer
)

User = get_user_model()

# ------------------- Fixtures -------------------

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
    def make_user(email='user@example.com', password='StrongPassword123!', first_name='Test', last_name='User', **kwargs):
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            **kwargs
        )
        return user
    return make_user

# ------------------- UserRegistrationSerializer Tests -------------------

@pytest.mark.django_db
class TestUserRegistrationSerializer:
    def test_valid_registration_data(self, user_data):
        """Test serializer with valid registration data"""
        serializer = UserRegistrationSerializer(data=user_data)
        assert serializer.is_valid()
        
        user = serializer.save()
        assert user.email == user_data['email']
        assert user.first_name == user_data['first_name'].title()  
        assert user.last_name == user_data['last_name'].title()    
        assert user.check_password(user_data['password'])
    
    def test_password_confirmation(self):
        """Test password confirmation validation"""
        data = {
            'email': 'test@example.com',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        serializer = UserRegistrationSerializer(data=data)
        assert serializer.is_valid()
        
        # Test mismatched passwords
        data['password_confirm'] = 'DifferentPassword123!'
        serializer = UserRegistrationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors
    
    def test_email_uniqueness(self, create_user):
        """Test email uniqueness validation"""
        existing_user = create_user(email='existing@example.com')
        
        data = {
            'email': 'existing@example.com',  # Already exists
            'password': 'StrongPassword123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        serializer = UserRegistrationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors
        assert 'already exists' in str(serializer.errors['email'][0])
    
    def test_weak_password(self):
        """Test weak password validation"""
        data = {
            'email': 'test@example.com',
            'password': '123',  # Too short/simple
            'first_name': 'Test',
            'last_name': 'User'
        }
        serializer = UserRegistrationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors
    
    def test_name_splitting(self):
        """Test splitting full name into first and last name"""
        data = {
            'email': 'test@example.com',
            'password': 'StrongPassword123!',
            'name': 'John Doe'  # Should be split into first_name and last_name
        }
        serializer = UserRegistrationSerializer(data=data)
        assert serializer.is_valid()
        
        user = serializer.save()
        assert user.first_name == 'John'
        assert user.last_name == 'Doe'
    
    def test_name_splitting_single_name(self):
        """Test handling single name in the name field"""
        data = {
            'email': 'test@example.com',
            'password': 'StrongPassword123!',
            'name': 'John'  # Only first name
        }
        serializer = UserRegistrationSerializer(data=data)
        assert serializer.is_valid()
        
        user = serializer.save()
        assert user.first_name == 'John'
        assert user.last_name == ''
    
    def test_optional_fields(self):
        """Test registration with only required fields"""
        data = {
            'email': 'minimal@example.com',
            'password': 'StrongPassword123!'
            # No first_name, last_name, or name
        }
        serializer = UserRegistrationSerializer(data=data)
        assert serializer.is_valid()
        
        user = serializer.save()
        assert user.email == 'minimal@example.com'
        assert user.first_name == ''
        assert user.last_name == ''

# ------------------- UserLoginSerializer Tests -------------------

class TestUserLoginSerializer:
    def test_valid_login_data(self):
        """Test serializer with valid login data"""
        data = {
            'email': 'test@example.com',
            'password': 'StrongPassword123!'
        }
        serializer = UserLoginSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data['email'] == data['email']
        assert serializer.validated_data['password'] == data['password']
    
    def test_missing_email(self):
        """Test serializer with missing email"""
        data = {
            'password': 'StrongPassword123!'
            # Missing email
        }
        serializer = UserLoginSerializer(data=data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors
    
    def test_missing_password(self):
        """Test serializer with missing password"""
        data = {
            'email': 'test@example.com'
            # Missing password
        }
        serializer = UserLoginSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors
    
    def test_invalid_email_format(self):
        """Test serializer with invalid email format"""
        data = {
            'email': 'invalid-email',
            'password': 'StrongPassword123!'
        }
        serializer = UserLoginSerializer(data=data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors

# ------------------- ResetPasswordSerializer Tests -------------------

class TestResetPasswordSerializer:
    def test_valid_password(self):
        """Test serializer with valid password"""
        data = {
            'password': 'NewStrongPassword123!'
        }
        serializer = ResetPasswordSerializer(data=data)
        assert serializer.is_valid()
        assert serializer.validated_data['password'] == data['password']
    
    def test_empty_password(self):
        """Test serializer with empty password"""
        data = {
            'password': ''
        }
        serializer = ResetPasswordSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors
    
    def test_missing_password(self):
        """Test serializer with missing password field"""
        data = {}  # No password field
        serializer = ResetPasswordSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password' in serializer.errors

# ------------------- UserProfileSerializer Tests -------------------

@pytest.mark.django_db
class TestUserProfileSerializer:
    def test_serialization(self, create_user):
        """Test serializing a user object"""
        user = create_user(
            email='profile@example.com',
            first_name='John',
            last_name='Doe',
            is_verified=True,
            can_list_driveway=True
        )
        
        serializer = UserProfileSerializer(user)
        data = serializer.data
        
        assert data['email'] == 'profile@example.com'
        assert data['first_name'] == 'John'
        assert data['last_name'] == 'Doe'
        assert data['full_name'] == 'John Doe'
        assert data['is_verified'] is True
        assert data['can_list_driveway'] is True
        assert 'id' in data
    
    def test_update_allowed_fields(self, create_user):
        """Test updating allowed fields"""
        user = create_user()
        
        data = {
            'first_name': 'Updated',
            'last_name': 'Name'
        }
        
        serializer = UserProfileSerializer(user, data=data, partial=True)
        assert serializer.is_valid()
        
        updated_user = serializer.save()
        assert updated_user.first_name == 'Updated'
        assert updated_user.last_name == 'Name'
    
    def test_update_readonly_fields(self, create_user):
        """Test that read-only fields cannot be updated"""
        user = create_user(is_verified=False, can_list_driveway=False)
        
        data = {
            'email': 'newemail@example.com',  
            'is_verified': True,              
            'can_list_driveway': True,        
            'first_name': 'Updated'          
        }
        
        serializer = UserProfileSerializer(user, data=data, partial=True)
        assert serializer.is_valid()
        
        updated_user = serializer.save()
        assert updated_user.email == 'user@example.com'  
        assert updated_user.is_verified is False         
        assert updated_user.can_list_driveway is False   
        assert updated_user.first_name == 'Updated'     
