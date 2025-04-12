from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from .models import User

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    password_confirm = serializers.CharField(write_only=True, required=False)  # Made optional
    name = serializers.CharField(required=False, write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'password', 'password_confirm', 'first_name', 'last_name', 'name')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'email': {'required': True},
        }
    
    def validate_password(self, value):
        """
        Validate password using Django's password validation system.
        """
        try:
            # This will use the validators defined in your settings.py
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
        
    def validate(self, attrs):
        # If password_confirm is provided, validate it matches password
        if 'password_confirm' in attrs and attrs.get('password') != attrs.get('password_confirm'):
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Check if email already exists
        email = attrs.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
            
        return attrs
        
    def create(self, validated_data):
        # Remove password_confirm from the data if it exists
        validated_data.pop('password_confirm', None)
        
        # Split name into first_name and last_name if provided
        if 'name' in validated_data and validated_data['name']:
            name_parts = validated_data.pop('name').split(' ', 1)
            validated_data['first_name'] = name_parts[0]
            validated_data['last_name'] = name_parts[1] if len(name_parts) > 1 else ''
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

class ResetPasswordSerializer(serializers.Serializer):
    # add validators=[validate_password] for password strength
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if not attrs['password']:
            raise serializers.ValidationError({"password": "Password required."})
        return attrs

class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'is_verified', 'can_list_driveway')
        read_only_fields = ('email', 'is_verified', 'can_list_driveway')
    
    def get_full_name(self, obj):
        return obj.get_full_name()
