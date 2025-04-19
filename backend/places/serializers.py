from rest_framework import serializers
from .models import Place, PlaceImage, Booking, BlockedPeriod

class PlaceImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PlaceImage
        fields = ['id', 'image_key', 'is_primary', 'url', 'created_at']
        
    def get_url(self, obj):
        if obj.image_key:
            from .s3_service import s3_service
            return s3_service.get_url(obj.image_key)
        elif obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['id', 'place', 'user', 'start_time', 'end_time', 'booking_time']
        read_only_fields = ['booking_time']


class BlockedPeriodSerializer(serializers.ModelSerializer):
    block_type_display = serializers.CharField(source='get_block_type_display', read_only=True)
    recurring_pattern_display = serializers.CharField(source='get_recurring_pattern_display', read_only=True)
    
    class Meta:
        model = BlockedPeriod
        fields = [
            'id', 'place', 'start_datetime', 'end_datetime', 'block_type', 
            'block_type_display', 'reason', 'is_recurring', 'recurring_pattern',
            'recurring_pattern_display', 'recurring_end_date', 'booking',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """
        Validate that end_datetime is after start_datetime and
        recurring_pattern is provided if is_recurring is True
        """
        if data.get('end_datetime') and data.get('start_datetime'):
            if data['end_datetime'] <= data['start_datetime']:
                raise serializers.ValidationError("End time must be after start time")
        
        if data.get('is_recurring') and not data.get('recurring_pattern'):
            raise serializers.ValidationError("Recurring pattern must be provided for recurring blocks")
        
        return data

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

