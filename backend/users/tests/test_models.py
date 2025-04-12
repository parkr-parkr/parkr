import pytest
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta
import uuid
from users.models import User, VerificationToken, PasswordResetToken

# ------------------- Fixtures -------------------

@pytest.fixture
def user_data():
    return {
        'email': 'test@example.com',
        'password': 'testpassword123',
        'first_name': 'Test',
        'last_name': 'User'
    }

@pytest.fixture
def create_user(db):
    def make_user(email='user@example.com', password='password123', first_name='Test', last_name='User', **kwargs):
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            **kwargs
        )
        return user
    return make_user

# ------------------- UserManager Tests -------------------

@pytest.mark.django_db
class TestUserManager:
    def test_create_user(self, user_data):
        """Test creating a regular user with UserManager"""
        user = User.objects.create_user(
            email=user_data['email'],
            password=user_data['password'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name']
        )
        
        assert user.email == user_data['email']
        assert user.first_name == user_data['first_name'].title()
        assert user.last_name == user_data['last_name'].title()
        assert user.name == f"{user_data['first_name'].title()} {user_data['last_name'].title()}"
        assert user.check_password(user_data['password'])
        assert not user.is_staff
        assert not user.is_superuser
        assert user.is_active
        assert not user.is_verified
        assert not user.can_list_driveway
    
    def test_create_superuser(self):
        """Test creating a superuser with UserManager"""
        admin_user = User.objects.create_superuser(
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User'
        )
        
        assert admin_user.email == 'admin@example.com'
        assert admin_user.is_staff
        assert admin_user.is_superuser
        assert admin_user.is_active
        assert not admin_user.is_verified
    
    def test_create_user_without_email(self):
        """Test creating a user without email raises ValueError"""
        with pytest.raises(ValueError) as excinfo:
            User.objects.create_user(email='', password='testpass123')
        
        assert 'The given email must be set' in str(excinfo.value)
    
    def test_create_superuser_with_is_staff_false(self):
        """Test creating a superuser with is_staff=False raises ValueError"""
        with pytest.raises(ValueError) as excinfo:
            User.objects.create_superuser(
                email='admin@example.com',
                password='adminpass123',
                is_staff=False
            )
        
        assert 'Superuser must have is_staff=True' in str(excinfo.value)
    
    def test_create_superuser_with_is_superuser_false(self):
        """Test creating a superuser with is_superuser=False raises ValueError"""
        with pytest.raises(ValueError) as excinfo:
            User.objects.create_superuser(
                email='admin@example.com',
                password='adminpass123',
                is_superuser=False
            )
        
        assert 'Superuser must have is_superuser=True' in str(excinfo.value)
    
    def test_email_normalization(self):
        """Test email is normalized when creating a user"""
        email = 'Test.User@EXAMPLE.com'
        user = User.objects.create_user(email=email, password='test123', first_name='Test', last_name='User')
        assert user.email == 'Test.User@example.com'  # Domain part should be lowercase

# ------------------- User Model Tests -------------------

@pytest.mark.django_db
class TestUserModel:
    def test_user_str_representation(self, create_user):
        """Test the string representation of a user"""
        user = create_user()
        assert str(user) == user.email
    
    def test_get_full_name(self, create_user):
        """Test get_full_name method"""
        user = create_user(first_name='John', last_name='Doe')
        assert user.get_full_name() == 'John Doe'
    
    def test_get_short_name(self, create_user):
        """Test get_short_name method"""
        user = create_user(first_name='John', last_name='Doe')
        assert user.get_short_name() == 'John'
    
    def test_set_new_password(self, create_user):
        """Test set_new_password method"""
        user = create_user()
        old_password_hash = user.password
        user.set_new_password('newpassword123')
        
        # Password should be changed
        assert user.password != old_password_hash
        assert user.check_password('newpassword123')
    
    def test_name_formatting_on_save(self):
        """Test that first_name and last_name are properly formatted on save"""
        user = User.objects.create_user(
            email='format@example.com',
            password='password123',
            first_name='john',  # lowercase
            last_name='doe'     # lowercase
        )
        
        # Names should be capitalized
        assert user.first_name == 'John'
        assert user.last_name == 'Doe'
        assert user.name == 'John Doe'
    
    def test_name_with_extra_spaces(self):
        """Test that extra spaces are stripped from names"""
        user = User.objects.create_user(
            email='spaces@example.com',
            password='password123',
            first_name='  Jane  ',
            last_name='  Smith  '
        )
        
        assert user.first_name == 'Jane'
        assert user.last_name == 'Smith'
        assert user.name == 'Jane Smith'
    
    def test_email_uniqueness(self, create_user):
        """Test that email must be unique"""
        create_user(email='unique@example.com')
        
        with pytest.raises(IntegrityError):
            create_user(email='unique@example.com')
    
    def test_name_generation_with_empty_fields(self):
        """Test name generation when first_name or last_name is empty"""
        user1 = User.objects.create_user(
            email='firstname@example.com',
            password='password123',
            first_name='OnlyFirst',
            last_name=''
        )
        
        user2 = User.objects.create_user(
            email='lastname@example.com',
            password='password123',
            first_name='',
            last_name='OnlyLast'
        )
        
        assert user1.name == 'Onlyfirst'
        assert user2.name == 'Onlylast'

# ------------------- VerificationToken Tests -------------------

@pytest.mark.django_db
class TestVerificationToken:
    def test_token_creation(self, create_user):
        """Test verification token is created with UUID"""
        user = create_user()
        token = VerificationToken.objects.create(user=user)
        
        assert token.token is not None
        assert isinstance(token.token, uuid.UUID)
        assert token.user == user
        assert token.created_at is not None
    
    def test_token_string_representation(self, create_user):
        """Test the string representation of token"""
        user = create_user()
        token = VerificationToken.objects.create(user=user)
        
        assert str(token) == str(token.token)
    
    def test_token_user_relationship(self, create_user):
        """Test the relationship between token and user"""
        user = create_user()
        token = VerificationToken.objects.create(user=user)
        
        # Get the token from the database
        db_token = VerificationToken.objects.get(user=user)
        assert db_token == token
    
    def test_token_deletion_on_user_deletion(self, create_user):
        """Test that tokens are deleted when the user is deleted"""
        user = create_user()
        token = VerificationToken.objects.create(user=user)
        
        # Delete the user
        user.delete()
        
        # Token should be deleted due to CASCADE
        assert not VerificationToken.objects.filter(token=token.token).exists()

# ------------------- PasswordResetToken Tests -------------------

@pytest.mark.django_db
class TestPasswordResetToken:
    def test_token_creation(self, create_user):
        """Test password reset token is created with UUID"""
        user = create_user()
        token = PasswordResetToken.objects.create(user=user)
        
        assert token.token is not None
        assert isinstance(token.token, uuid.UUID)
        assert token.user == user
        assert token.created_at is not None
    
    def test_token_string_representation(self, create_user):
        """Test the string representation of token"""
        user = create_user()
        token = PasswordResetToken.objects.create(user=user)
        
        assert str(token) == str(token.token)
    
    def test_token_user_relationship(self, create_user):
        """Test the relationship between token and user"""
        user = create_user()
        token = PasswordResetToken.objects.create(user=user)
        
        # Get the token from the database
        db_token = PasswordResetToken.objects.get(user=user)
        assert db_token == token
    
    def test_token_deletion_on_user_deletion(self, create_user):
        """Test that tokens are deleted when the user is deleted"""
        user = create_user()
        token = PasswordResetToken.objects.create(user=user)
        
        # Delete the user
        user.delete()
        
        # Token should be deleted due to CASCADE
        assert not PasswordResetToken.objects.filter(token=token.token).exists()
    
    def test_multiple_tokens_per_user(self, create_user):
        """Test that a user can have multiple password reset tokens"""
        user = create_user()
        token1 = PasswordResetToken.objects.create(user=user)
        token2 = PasswordResetToken.objects.create(user=user)
        
        tokens = PasswordResetToken.objects.filter(user=user)
        assert tokens.count() == 2
        assert token1 in tokens
        assert token2 in tokens
