from rest_framework import permissions, status, parsers
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
import logging
import traceback

from .models import Place
from .serializers import PlaceSerializer

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_places_by_location(request):
    """
    Retrieve parking places based on longitude and latitude.
    """
    latitude = request.query_params.get('latitude', None)
    longitude = request.query_params.get('longitude', None)
    latitude_range = request.query_params.get('latitude_range', None)
    longitude_range = request.query_params.get('longitude_range', None)

    if not latitude or not longitude or not latitude_range or not longitude_range:
        return Response({"error": "Latitude, longitude, latitude_range, and longitude_range are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        latitude = float(latitude)
        longitude = float(longitude)
        latitude_range = float(latitude_range)
        longitude_range = float(longitude_range)
    except ValueError:
        return Response({"error": "Invalid latitude, longitude, latitude_range, or longitude_range."}, status=status.HTTP_400_BAD_REQUEST)

    # Use the class method directly on the Place model
    places = Place.find_by_location(latitude, longitude, latitude_range, longitude_range)

    serializer = PlaceSerializer(places, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def list_driveway(request):
    """Endpoint for listing a driveway"""
    try:
        # Use the model method to prepare data
        data = Place.prepare_listing_data(request.data)
        serializer = PlaceSerializer(data=data, context={'request': request})

        if serializer.is_valid():
            with transaction.atomic():
                # Save the place with the owner
                place = serializer.save(owner=request.user)

                # Use the model method to handle image uploads
                photo_count = int(request.data.get('photo_count', 0))
                place.add_images(request.FILES, photo_count)

                # Return the created place with images
                place_serializer = PlaceSerializer(place, context={'request': request})
                return Response(place_serializer.data, status=status.HTTP_201_CREATED)
        else:
            logger.error("Serializer errors: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error("Exception in list_driveway: %s\n%s", str(e), traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users_listings(request):
    listings = Place.objects.filter(owner=request.user)
    serializer = PlaceSerializer(listings, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def listing(request, listing_id):
    try:
        listing_obj = Place.objects.get(id=listing_id)
        if listing_obj.owner != request.user:
            return Response({"error": "You don't have permission to modify this listing"}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        if request.method == 'GET':
            serializer = PlaceSerializer(listing_obj)
            return Response(serializer.data)
            
        elif request.method == 'PATCH':
            # Use the model method to prepare data
            data = Place.prepare_listing_data(request.data)
            serializer = PlaceSerializer(listing_obj, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        elif request.method == 'DELETE':
            with transaction.atomic():
                # Use the model method to delete the place and its images
                success_count, failed_images = listing_obj.delete_with_images()
                
                if failed_images:
                    logger.warning(f"Listing {listing_id} deleted but failed to delete some images: {failed_images}")
                    return Response({
                        "message": f"Listing deleted successfully. Deleted {success_count} images, but failed to delete {len(failed_images)} images from storage.",
                        "failed_images": failed_images
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        "message": f"Listing deleted successfully with {success_count} images."
                    }, status=status.HTTP_200_OK)
                
    except Place.DoesNotExist:  
        return Response({"error": "Listing not found"}, 
                       status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error handling listing {listing_id}: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def check_availability(request):
    """Check if a parking space is available during a specific time period"""
    place_id = request.query_params.get('place_id')
    start_datetime_str = request.query_params.get('start_datetime')
    end_datetime_str = request.query_params.get('end_datetime')
    
    if not all([place_id, start_datetime_str, end_datetime_str]):
        return Response(
            {'error': 'place_id, start_datetime, and end_datetime are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        place = Place.objects.get(id=place_id)
        
        # Parse datetimes using the model method
        try:
            start_datetime = Place.parse_datetime(start_datetime_str)
            end_datetime = Place.parse_datetime(end_datetime_str)
        except ValueError:
            return Response(
                {'error': 'Invalid datetime format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use the model's is_available method
        is_available, reason = place.is_available(start_datetime, end_datetime)
        
        return Response({
            'available': is_available,
            'reason': reason if not is_available else None
        })
    
    except Place.DoesNotExist:
        return Response(
            {'error': 'Parking space not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error checking availability: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)