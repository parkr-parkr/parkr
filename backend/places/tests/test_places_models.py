import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import pytz  # Import pytz for timezone handling

from places.models import Place, Availability, Booking, PlaceImage, listing_image_path
import uuid

User = get_user_model()

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
    def make_user(email='user@example.com', password='password123', **kwargs):
        return User.objects.create_user(email=email, password=password, **kwargs)
    return make_user

@pytest.fixture
def place_data():
    return {
        'name': 'Test Driveway',
        'description': 'A nice driveway for parking',
        'address': '123 Test St',
        'city': 'Test City',
        'state': 'Test State',
        'zip_code': '12345',
        'latitude': Decimal('37.7749'),
        'longitude': Decimal('-122.4194'),
        'price_per_hour': Decimal('5.00')
    }

@pytest.fixture
def create_place(db, create_user):
    def make_place(owner=None, **kwargs):
        if owner is None:
            owner = create_user(email=f"user_{uuid.uuid4()}@example.com")  # Generate unique email
        
        place_data = {
            'name': 'Test Driveway',
            'description': 'A nice driveway for parking',
            'address': '123 Test St',
            'city': 'Test City',
            'state': 'Test State',
            'zip_code': '12345',
            'latitude': Decimal('37.7749'),
            'longitude': Decimal('-122.4194'),
            'price_per_hour': Decimal('5.00')
        }
        
        place_data.update(kwargs)
        return Place.objects.create(owner=owner, **place_data)
    return make_place

@pytest.fixture
def create_availability(db, create_place):
    def make_availability(place=None, start_time=None, end_time=None):
        if place is None:
            place = create_place()
        
        if start_time is None:
            start_time = timezone.now() + timedelta(hours=1)
        
        if end_time is None:
            end_time = start_time + timedelta(hours=2)
            
        return Availability.objects.create(
            place=place,
            start_time=start_time,
            end_time=end_time
        )
    return make_availability

@pytest.fixture
def create_booking(db, create_place, create_user):
    def make_booking(place=None, user=None, start_time=None, end_time=None):
        if place is None:
            place = create_place()
        
        if user is None:
            user = create_user(email=f"booker_{uuid.uuid4()}@example.com")  # Generate unique email
        
        if start_time is None:
            start_time = timezone.now() + timedelta(hours=1)
        
        if end_time is None:
            end_time = start_time + timedelta(hours=2)
            
        return Booking.objects.create(
            place=place,
            user=user,
            start_time=start_time,
            end_time=end_time
        )
    return make_booking

@pytest.fixture
def mock_s3_service():
    with patch('places.models.s3_service') as mock_service:
        mock_service.get_url.return_value = 'https://example.com/test-image.jpg'
        yield mock_service

# ------------------- Place Model Tests -------------------

@pytest.mark.django_db
class TestPlaceModel:
    def test_create_place(self, create_user, place_data):
        """Test creating a place with valid data"""
        owner = create_user()
        place = Place.objects.create(owner=owner, **place_data)
        
        assert place.name == place_data['name']
        assert place.description == place_data['description']
        assert place.address == place_data['address']
        assert place.city == place_data['city']
        assert place.state == place_data['state']
        assert place.zip_code == place_data['zip_code']
        assert place.latitude == place_data['latitude']
        assert place.longitude == place_data['longitude']
        assert place.price_per_hour == place_data['price_per_hour']
        assert place.owner == owner
        assert place.created_at is not None
        assert place.updated_at is not None
    
    def test_place_string_representation(self, create_place):
        """Test the string representation of a place"""
        place = create_place(name="My Driveway")
        assert str(place) == "My Driveway"
    
    def test_place_ordering(self, create_user):
        """Test that places are ordered by created_at in descending order"""
        # Create two users with unique emails
        user1 = create_user(email="user1@example.com")
        user2 = create_user(email="user2@example.com")
        
        # Create places with these users
        place1 = Place.objects.create(
            owner=user1,
            name="First Place",
            address="123 Test St",
            city="Test City",
            state="Test State",
            zip_code="12345",
            price_per_hour=Decimal('5.00')
        )
        place2 = Place.objects.create(
            owner=user2,
            name="Second Place",
            address="123 Test St",
            city="Test City",
            state="Test State",
            zip_code="12345",
            price_per_hour=Decimal('5.00')
        )
        
        places = Place.objects.all()
        assert places[0] == place2  # Second place should be first (most recent)
        assert places[1] == place1
    
    def test_place_with_optional_fields(self, create_user):
        """Test creating a place with optional fields left blank"""
        owner = create_user()
        place = Place.objects.create(
            owner=owner,
            name="Minimal Place",
            address="123 Min St",
            city="Min City",
            state="Min State",
            zip_code="12345",
            price_per_hour=Decimal('3.50')
        )
        
        assert place.description == ""
        assert place.latitude is None
        assert place.longitude is None
    
    def test_place_related_owner(self, create_place, create_user):
        """Test the related_name for owner works correctly"""
        owner = create_user()
        place = create_place(owner=owner)
        
        assert place in owner.places.all()

# ------------------- Availability Model Tests -------------------

@pytest.mark.django_db
class TestAvailabilityModel:
    def test_create_availability(self, create_place):
        """Test creating an availability period"""
        place = create_place()
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        availability = Availability.objects.create(
            place=place,
            start_time=start_time,
            end_time=end_time
        )
        
        assert availability.place == place
        assert availability.start_time == start_time
        assert availability.end_time == end_time
    
    def test_availability_string_representation(self, create_availability):
        """Test the string representation of an availability"""
        place = Place.objects.create(
            owner=User.objects.create_user(email='test_avail@example.com', password='password123'),
            name="Test Place",
            address="123 Test St",
            city="Test City",
            state="Test State",
            zip_code="12345",
            price_per_hour=Decimal('5.00')
        )
        
        # Use timezone.make_aware instead of timezone.utc
        start_time = timezone.make_aware(datetime(2023, 1, 1, 10, 0))
        end_time = timezone.make_aware(datetime(2023, 1, 1, 12, 0))
        
        availability = Availability.objects.create(
            place=place,
            start_time=start_time,
            end_time=end_time
        )
        
        expected_str = f"Test Place: {start_time} - {end_time}"
        assert str(availability) == expected_str
    
    def test_availability_related_place(self, create_place, create_availability):
        """Test the related_name for place works correctly"""
        place = create_place()
        availability = create_availability(place=place)
        
        assert availability in place.availabilities.all()

# ------------------- Booking Model Tests -------------------

@pytest.mark.django_db
class TestBookingModel:
    def test_create_booking(self, create_place, create_user):
        """Test creating a booking"""
        place = create_place()
        user = create_user(email='booker_test@example.com')
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        booking = Booking.objects.create(
            place=place,
            user=user,
            start_time=start_time,
            end_time=end_time
        )
        
        assert booking.place == place
        assert booking.user == user
        assert booking.start_time == start_time
        assert booking.end_time == end_time
        assert booking.booking_time is not None
    
    def test_booking_string_representation(self, create_booking):
        """Test the string representation of a booking"""
        user = User.objects.create_user(email='booker_str@example.com', password='password123')
        place = Place.objects.create(
            owner=User.objects.create_user(email='owner_str@example.com', password='password123'),
            name="Test Place",
            address="123 Test St",
            city="Test City",
            state="Test State",
            zip_code="12345",
            price_per_hour=Decimal('5.00')
        )
        
        # Use timezone.make_aware instead of timezone.utc
        start_time = timezone.make_aware(datetime(2023, 1, 1, 10, 0))
        end_time = timezone.make_aware(datetime(2023, 1, 1, 12, 0))
        
        booking = Booking.objects.create(
            place=place,
            user=user,
            start_time=start_time,
            end_time=end_time
        )
        
        expected_str = f"booker_str@example.com booked Test Place from {start_time} to {end_time}"
        assert str(booking) == expected_str
    
    def test_booking_ordering(self, create_user):
        """Test that bookings are ordered by booking_time in descending order"""
        # Create users with unique emails
        user1 = create_user(email="booking_user1@example.com")
        user2 = create_user(email="booking_user2@example.com")
        owner1 = create_user(email="booking_owner1@example.com")
        owner2 = create_user(email="booking_owner2@example.com")
        
        # Create places with unique owners
        place1 = Place.objects.create(
            owner=owner1,
            name="Place 1",
            address="123 Test St",
            city="Test City",
            state="Test State",
            zip_code="12345",
            price_per_hour=Decimal('5.00')
        )
        place2 = Place.objects.create(
            owner=owner2,
            name="Place 2",
            address="123 Test St",
            city="Test City",
            state="Test State",
            zip_code="12345",
            price_per_hour=Decimal('5.00')
        )
        
        # Create bookings
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        booking1 = Booking.objects.create(
            place=place1,
            user=user1,
            start_time=start_time,
            end_time=end_time
        )
        
        booking2 = Booking.objects.create(
            place=place2,
            user=user2,
            start_time=start_time,
            end_time=end_time
        )
        
        bookings = Booking.objects.all()
        assert bookings[0] == booking2  # Second booking should be first (most recent)
        assert bookings[1] == booking1
    
    def test_booking_related_place_and_user(self, create_place, create_user, create_booking):
        """Test the related_name for place and user work correctly"""
        place = create_place()
        user = create_user(email='booker_related@example.com')
        booking = create_booking(place=place, user=user)
        
        assert booking in place.bookings.all()
        assert booking in user.bookings.all()

# ------------------- PlaceImage Model Tests -------------------

@pytest.mark.django_db
class TestPlaceImageModel:
    def test_create_place_image(self, create_place):
        """Test creating a place image"""
        place = create_place()
        image = PlaceImage.objects.create(
            place=place,
            image_key='test-key.jpg',
            is_primary=True
        )
        
        assert image.place == place
        assert image.image_key == 'test-key.jpg'
        assert image.is_primary is True
        assert image.created_at is not None
    
    def test_place_image_url_property(self, create_place, mock_s3_service):
        """Test the url property of a place image"""
        place = create_place()
        image = PlaceImage.objects.create(
            place=place,
            image_key='test-key.jpg'
        )
        
        assert image.url == 'https://example.com/test-image.jpg'
        mock_s3_service.get_url.assert_called_once_with('test-key.jpg')
    
    def test_place_image_url_property_no_key(self, create_place):
        """Test the url property when image_key is blank"""
        place = create_place()
        image = PlaceImage.objects.create(
            place=place,
            image_key=''
        )
        
        assert image.url is None
    
    @patch('places.models.s3_service')
    def test_place_image_delete(self, mock_s3, create_place):
        """Test that deleting a place image also deletes it from S3"""
        place = create_place()
        image = PlaceImage.objects.create(
            place=place,
            image_key='test-key.jpg'
        )
        
        image.delete()
        
        mock_s3.delete_file.assert_called_once_with('test-key.jpg')
    
    @patch('places.models.s3_service')
    @patch('places.models.logger')
    def test_place_image_delete_error_handling(self, mock_logger, mock_s3, create_place):
        """Test error handling when deleting from S3 fails"""
        mock_s3.delete_file.side_effect = Exception("S3 error")
        
        place = create_place()
        image = PlaceImage.objects.create(
            place=place,
            image_key='test-key.jpg'
        )
        
        image.delete()
        
        mock_s3.delete_file.assert_called_once_with('test-key.jpg')
        mock_logger.error.assert_called_once()
        assert "Error deleting image from S3" in mock_logger.error.call_args[0][0]
    
    def test_place_image_related_place(self, create_place):
        """Test the related_name for place works correctly"""
        place = create_place()
        image = PlaceImage.objects.create(
            place=place,
            image_key='test-key.jpg'
        )
        
        assert image in place.images.all()

# ------------------- Helper Function Tests -------------------

def test_listing_image_path():
    """Test the listing_image_path function generates correct paths"""
    place = MagicMock()
    place.id = 123
    
    filename = "test_image.jpg"
    path = listing_image_path(instance=MagicMock(place=place), filename=filename)
    
    assert path.startswith(f"listings/123/")
    assert path.endswith(".jpg")
    assert str(uuid.UUID(path.split("/")[-1].split(".")[0]))  # Verify UUID format
