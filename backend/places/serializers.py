from rest_framework import serializers
from .models import Place, PlaceImage

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

class PlaceSerializer(serializers.ModelSerializer):
    """Serializer for places/driveway listings"""
    images = PlaceImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Place
        fields = [
            'id', 'name', 'description', 'address', 'city', 'state',
            'zip_code', 'latitude', 'longitude', 'price_per_hour', 'created_at', 'updated_at', 'images'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
