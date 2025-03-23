from django.test import TestCase
from django.contrib.auth import get_user_model
from users.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserProfileSerializer
)
from django.core.exceptions import ValidationError
import logging

# Disable logging during tests
logging.disable(logging.CRITICAL)

User = get_user_model()

class UserRegistrationSerializerTests(TestCase):
    """Tests for the UserRegistrationSerializer."""
    
    def setUp(self):
        """Set up test data."""
        self.valid_data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'testpass123',
            'password_confirm': 'testpass123',
            'first_name': 'Test',
            'last_name': 'User'
        }
        
        # Create a user for duplicate testing
        self.existing_user = User.objects.create_user(
            email='existing@example.com',
            username='existinguser',
            password='testpass123'
        )
    
    def test_valid_data(self):
        """Test serializer with valid data."""
        serializer = UserRegistrationSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
    
    def test_password_validation(self):
        """Test password validation."""
        # Test with mismatched passwords
        data = self.valid_data.copy()
        data['password_confirm'] = 'differentpass'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
    
    def test_password_confirm_optional(self):
        """Test that password_confirm is optional."""
        data = self.valid_data.copy()
        data.pop('password_confirm')
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_name_field_splitting(self):
        """Test that the name field is split into first_name and last_name."""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'name': 'John Doe'
        }
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        user = serializer.save()
        self.assertEqual(user.first_name, 'John')
        self.assertEqual(user.last_name, 'Doe')
    
    def test_name_field_single_name(self):
        """Test that the name field works with a single name."""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'name': 'John'
        }
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        user = serializer.save()
        self.assertEqual(user.first_name, 'John')
        self.assertEqual(user.last_name, '')
    
    def test_username_generation(self):
        """Test that username is generated from email if not provided."""
        data = {
            'email': 'johndoe@example.com',
            'password': 'testpass123'
        }
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        user = serializer.save()
        self.assertEqual(user.username, 'johndoe')
    
    def test_empty_username(self):
        """Test that username is generated if provided as empty."""
        data = {
            'email': 'johndoe@example.com',
            'username': '',
            'password': 'testpass123'
        }
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        user = serializer.save()
        self.assertEqual(user.username, 'johndoe')
    
    def test_duplicate_email(self):
        """Test that duplicate emails are rejected."""
        data = self.valid_data.copy()
        data['email'] = 'existing@example.com'
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
    
    def test_required_fields(self):
        """Test that required fields are enforced."""
        # Test without email
        data = self.valid_data.copy()
        data.pop('email')
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
        
        # Test without password
        data = self.valid_data.copy()
        data.pop('password')
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
    
    def test_optional_fields(self):
        """Test that optional fields are truly optional."""
        data = {
            'email': 'minimal@example.com',
            'password': 'testpass123'
        }
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        user = serializer.save()
        self.assertEqual(user.email, 'minimal@example.com')
        self.assertEqual(user.first_name, '')
        self.assertEqual(user.last_name, '')
        self.assertEqual(user.username, 'minimal')


class UserLoginSerializerTests(TestCase):
    """Tests for the UserLoginSerializer."""
    
    def test_valid_data(self):
        """Test serializer with valid data."""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_required_fields(self):
        """Test that required fields are enforced."""
        # Test without email
        data = {
            'password': 'testpass123'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)
        
        # Test without password
        data = {
            'email': 'test@example.com'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)
    
    def test_invalid_email_format(self):
        """Test that email format is validated."""
        data = {
            'email': 'invalid-email',
            'password': 'testpass123'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)


class UserProfileSerializerTests(TestCase):
    """Tests for the UserProfileSerializer."""
    
    def setUp(self):
        """Set up test user."""
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User',
            is_verified=True
        )
    
    def test_serialization(self):
        """Test serializing a user."""
        serializer = UserProfileSerializer(self.user)
        data = serializer.data
        
        self.assertEqual(data['email'], 'test@example.com')
        self.assertEqual(data['username'], 'testuser')
        self.assertEqual(data['first_name'], 'Test')
        self.assertEqual(data['last_name'], 'User')
        self.assertEqual(data['full_name'], 'Test User')
        self.assertTrue(data['is_verified'])
    
    def test_read_only_fields(self):
        """Test that read-only fields cannot be updated."""
        serializer = UserProfileSerializer(
            self.user,
            data={'email': 'newemail@example.com', 'is_verified': False},
            partial=True
        )
        
        self.assertTrue(serializer.is_valid())
        updated_user = serializer.save()
        
        # Email and is_verified should not have changed
        self.assertEqual(updated_user.email, 'test@example.com')
        self.assertTrue(updated_user.is_verified)
    
    def test_update_fields(self):
        """Test updating fields."""
        serializer = UserProfileSerializer(
            self.user,
            data={'first_name': 'Updated', 'last_name': 'Name'},
            partial=True
        )
        
        self.assertTrue(serializer.is_valid())
        updated_user = serializer.save()
        
        self.assertEqual(updated_user.first_name, 'Updated')
        self.assertEqual(updated_user.last_name, 'Name')
        
        # Check that full_name is updated
        updated_serializer = UserProfileSerializer(updated_user)
        self.assertEqual(updated_serializer.data['full_name'], 'Updated Name')
    
    def test_full_name_with_empty_fields(self):
        """Test full_name with empty first or last name."""
        # Test with empty last name
        user_with_first_only = User.objects.create_user(
            email='first@example.com',
            username='firstonly',
            password='testpass123',
            first_name='First',
            last_name=''
        )
        
        serializer = UserProfileSerializer(user_with_first_only)
        self.assertEqual(serializer.data['full_name'], 'First')
        
        # Test with empty first name
        user_with_last_only = User.objects.create_user(
            email='last@example.com',
            username='lastonly',
            password='testpass123',
            first_name='',
            last_name='Last'
        )
        
        serializer = UserProfileSerializer(user_with_last_only)
        self.assertEqual(serializer.data['full_name'], 'Last')
        
        # Test with both empty
        user_with_neither = User.objects.create_user(
            email='neither@example.com',
            username='neither',
            password='testpass123',
            first_name='',
            last_name=''
        )
        
        serializer = UserProfileSerializer(user_with_neither)
        self.assertEqual(serializer.data['full_name'], '')

