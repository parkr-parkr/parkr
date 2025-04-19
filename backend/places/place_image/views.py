from rest_framework import status, parsers
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
import logging

from .models import PlaceImage
from .serializers import PlaceImageSerializer
from places.place.models import Place

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def add_image(request):
    """Add an image to a listing"""
    place_id = request.data.get('place_id')
    is_primary = request.data.get('is_primary', 'false').lower() == 'true'
    
    try:
        place = Place.objects.get(id=place_id, owner=request.user)
    except Place.DoesNotExist:
        return Response({"error": "Listing not found or you don't have permission"}, 
                       status=status.HTTP_404_NOT_FOUND)
    
    if 'image' not in request.FILES:
        return Response({"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Use the model method to add the image
    image_file = request.FILES['image']
    place_image = PlaceImage.add_image_to_place(place, image_file, is_primary)
    
    serializer = PlaceImageSerializer(place_image)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_image(request, image_id):
    """Delete a specific image"""
    try:
        image = PlaceImage.objects.get(id=image_id, place__owner=request.user)
        image.delete()  # This calls the overridden delete method that handles S3 cleanup
        return Response({"message": "Image deleted successfully"}, status=status.HTTP_200_OK)
    except PlaceImage.DoesNotExist:
        return Response({"error": "Image not found or you don't have permission"}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_primary_image(request, image_id):
    """Set an image as the primary image for a listing"""
    try:
        image = PlaceImage.objects.get(id=image_id, place__owner=request.user)
        
        # Use the model method to set as primary
        image.set_as_primary()
        
        return Response({"message": "Primary image updated successfully"}, status=status.HTTP_200_OK)
    except PlaceImage.DoesNotExist:
        return Response({"error": "Image not found or you don't have permission"}, 
                       status=status.HTTP_404_NOT_FOUND)
