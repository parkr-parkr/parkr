from rest_framework import serializers
from .models import Booking

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['id', 'place', 'user', 'start_time', 'end_time', 'booking_time']
        read_only_fields = ['booking_time']