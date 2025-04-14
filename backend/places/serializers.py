from rest_framework import serializers
from .models import Place, PlaceImage, Availability, Booking

class PlaceImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PlaceImage
        fields = ['id', 'image_key', 'is_primary', 'url', 'created_at']
        

class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ['id', 'place', 'start_time', 'end_time']

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['id', 'place', 'user', 'start_time', 'end_time', 'booking_time']
        read_only_fields = ['booking_time']

class PlaceSerializer(serializers.ModelSerializer):
    """Serializer for places/driveway listings"""
    images = PlaceImageSerializer(many=True, read_only=True)
    availabilities = AvailabilitySerializer(many=True, read_only=True)
    bookings = BookingSerializer(many=True, read_only=True)

    class Meta:
        model = Place
        fields = [
            'id', 'name', 'description', 'address', 'city', 'state',
            'zip_code', 'latitude', 'longitude', 'price_per_hour', 'created_at', 'updated_at', 'images', 'availabilities', 'bookings'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
