from rest_framework import serializers
from .models import Place
from places.place_image.serializers import PlaceImageSerializer
from places.booking.serializers import BookingSerializer
from places.blocked_period.serializers import BlockedPeriodSerializer

class PlaceSerializer(serializers.ModelSerializer):
    """Serializer for places/driveway listings"""
    images = PlaceImageSerializer(many=True, read_only=True)
    bookings = BookingSerializer(many=True, read_only=True)
    blocked_periods = BlockedPeriodSerializer(many=True, read_only=True)

    class Meta:
        model = Place
        fields = [
            'id', 'name', 'description', 'address', 'city', 'state',
            'zip_code', 'latitude', 'longitude', 'price_per_hour', 'created_at', 'updated_at', 'images', 'bookings', 'blocked_periods'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']