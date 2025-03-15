from rest_framework import serializers
from .models import Place, Booking

class PlaceSerializer(serializers.ModelSerializer):
    owner_name = serializers.ReadOnlyField(source='owner.name')
    
    class Meta:
        model = Place
        fields = '__all__'
        read_only_fields = ('owner', 'created_at', 'updated_at')
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)

class BookingSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.name')
    place_name = serializers.ReadOnlyField(source='place.name')
    
    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ('user', 'total_price', 'status', 'created_at', 'updated_at')
    
    def create(self, validated_data):
        # Set the user to the current authenticated user
        validated_data['user'] = self.context['request'].user
        
        # Calculate the total price based on the duration and the place's price per hour
        place = validated_data['place']
        start_time = validated_data['start_time']
        end_time = validated_data['end_time']
        
        # Calculate duration in hours
        duration = (end_time - start_time).total_seconds() / 3600
        
        # Calculate total price
        validated_data['total_price'] = place.price_per_hour * duration
        
        return super().create(validated_data)

