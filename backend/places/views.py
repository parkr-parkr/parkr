from rest_framework import viewsets, permissions, status, parsers
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.response import Response
from .models import Place, PlaceImage, BlockedPeriod, Booking
from .serializers import PlaceSerializer, PlaceImageSerializer, BlockedPeriodSerializer
from django.db import transaction
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .s3_service import s3_service
from .util.address_utils import AddressParser
from .util.location_utils import LocationParser
from datetime import datetime, timedelta
import logging


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

    min_latitude = latitude - latitude_range / 2
    max_latitude = latitude + latitude_range / 2
    min_longitude = longitude - longitude_range / 2
    max_longitude = longitude + longitude_range / 2

    places = Place.objects.filter(
        latitude__range=(min_latitude, max_latitude),
        longitude__range=(min_longitude, max_longitude)
    )

    serializer = PlaceSerializer(places, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def list_driveway(request):
    """Endpoint for listing a driveway"""
    try:
        # Print detailed request information for debugging
        print("\n--- LIST DRIVEWAY REQUEST ---")
        print(f"Content-Type: {request.META.get('CONTENT_TYPE', 'Not provided')}")
        print(f"Request method: {request.method}")
        print(f"Request data: {request.data}")
        print(f"Request FILES: {request.FILES}")
        print("--- END REQUEST INFO ---\n")

        # Create a clean copy of the data without is_active
        data = {}
        for key, value in request.data.items():
            if key == 'description' and (value == 'undefined' or value == 'null'):
                data[key] = ''  # Replace with empty string
            elif key != 'is_active':
                data[key] = value

        AddressParser.fill_address_data(data)

        data = LocationParser.parse_location(data)

        serializer = PlaceSerializer(data=data, context={'request': request})

        if serializer.is_valid():
            with transaction.atomic():
                # Save the place with the owner
                place = serializer.save(owner=request.user)

                # Handle image uploads
                images = []
                photo_count = int(request.data.get('photo_count', 0))

                for i in range(1, photo_count + 1):
                    photo_key = f'photo_{i}'
                    if photo_key in request.FILES:
                        image = request.FILES[photo_key]
                        # Set the first image as primary
                        is_primary = i == 1

                        # Upload the image to S3
                        directory = f"listings/{place.id}"
                        image_key = s3_service.upload_file(image, directory=directory)

                        # Create the PlaceImage with the S3 key
                        place_image = PlaceImage.objects.create(
                            place=place,
                            image_key=image_key,
                            is_primary=is_primary
                        )

                        print(f"Uploaded image to S3: {image_key}")
                        print(f"Image URL: {place_image.url}")

                        images.append(place_image)

                # Return the created place with images
                place_serializer = PlaceSerializer(place, context={'request': request})
                return Response(place_serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        print("Exception in list_driveway:", str(e))
        print(traceback.format_exc())
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
            data = request.data
            AddressParser.fill_address_data(data)
            data = LocationParser.parse_location(data)
            serializer = PlaceSerializer(listing_obj, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        elif request.method == 'DELETE':
            with transaction.atomic():
                success_count, failed_images = _delete_place_images(listing_obj)
                listing_obj.delete()
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

def _delete_place_images(place):
    """
    Helper function to delete all images associated with a place and clean up S3.
    
    Args:
        place: The Place object whose images should be deleted
        
    Returns:
        tuple: (success_count, failed_images) where failed_images is a list of failed image IDs
    """
    
    images = PlaceImage.objects.filter(place=place)
    logger.info(f"Found {images.count()} images to delete for listing {place.id}")
    
    success_count = 0
    failed_images = []
    
    for image in images:
        image_id = image.id
        image_key = getattr(image, 'image_key', None)
        
        logger.info(f"Deleting image {image_id} with key: {image_key}")
        
        try:
            image.delete() 
            logger.info(f"Successfully deleted image {image_id}")
            success_count += 1
        except Exception as e:
            logger.error(f"Error deleting image {image_id}: {str(e)}", exc_info=True)
            failed_images.append(image_id)
    
    return success_count, failed_images

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
    
    image = request.FILES['image']
    directory = f"listings/{place.id}"
    image_key = s3_service.upload_file(image, directory=directory)
    
    if is_primary:
        PlaceImage.objects.filter(place=place, is_primary=True).update(is_primary=False)
    
    place_image = PlaceImage.objects.create(
        place=place,
        image_key=image_key,
        is_primary=is_primary
    )
    
    serializer = PlaceImageSerializer(place_image)
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_image(request, image_id):
    """Delete a specific image"""
    try:
        image = PlaceImage.objects.get(id=image_id, place__owner=request.user)
        image.delete()  
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
        place = image.place
        
        PlaceImage.objects.filter(place=place, is_primary=True).update(is_primary=False)
        
        image.is_primary = True
        image.save()
        
        return Response({"message": "Primary image updated successfully"}, status=status.HTTP_200_OK)
    except PlaceImage.DoesNotExist:
        return Response({"error": "Image not found or you don't have permission"}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def blocked_periods(request):
    """
    GET: Get all blocked periods for a specific parking space
    POST: Create a new blocked period for a parking space
    """
    if request.method == 'GET':
        # Get all blocked periods for a specific parking space
        place_id = request.query_params.get('place_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not place_id:
            return Response(
                {'error': 'place_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            place = Place.objects.get(id=place_id)
            
            # Check if user is the owner
            if place.owner != request.user:
                return Response(
                    {'error': 'You do not have permission to view blocked periods for this space'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Base query
            blocked_periods = BlockedPeriod.objects.filter(place=place)
            
            # Filter by date range if provided
            if start_date and end_date:
                try:
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    
                    # Get non-recurring blocks that overlap with the date range
                    date_range_blocks = blocked_periods.filter(
                        is_recurring=False,
                        start_datetime__lt=end_date,
                        end_datetime__gt=start_date
                    )
                    
                    # Get recurring blocks
                    recurring_blocks = blocked_periods.filter(is_recurring=True)
                    
                    # Combine the querysets
                    blocked_periods = date_range_blocks | recurring_blocks
                    
                except ValueError:
                    return Response(
                        {'error': 'Invalid date format'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            serializer = BlockedPeriodSerializer(blocked_periods, many=True)
            return Response(serializer.data)
        
        except Place.DoesNotExist:
            return Response(
                {'error': 'Parking space not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting blocked periods: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        # Create a new blocked period for a parking space
        try:
            place_id = request.data.get('place_id')
            
            try:
                place = Place.objects.get(id=place_id, owner=request.user)
            except Place.DoesNotExist:
                return Response(
                    {'error': 'Parking space not found or you do not have permission'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Add debug logging to see what's coming in
            logger.info(f"Received start_datetime: {request.data.get('start_datetime')}")
            logger.info(f"Received end_datetime: {request.data.get('end_datetime')}")
            
            try:
                # Parse the datetime strings with timezone handling
                start_datetime_str = request.data.get('start_datetime')
                end_datetime_str = request.data.get('end_datetime')
                
                # Handle ISO format with timezone info
                if 'Z' in start_datetime_str or '+' in start_datetime_str or '-' in start_datetime_str:
                    # Already has timezone info, just parse it
                    start_datetime = datetime.fromisoformat(start_datetime_str.replace('Z', '+00:00'))
                    end_datetime = datetime.fromisoformat(end_datetime_str.replace('Z', '+00:00'))
                else:
                    # No timezone info, treat as UTC
                    from django.utils import timezone
                    import pytz
                    
                    # Parse as naive datetime then make timezone-aware
                    naive_start = datetime.fromisoformat(start_datetime_str)
                    naive_end = datetime.fromisoformat(end_datetime_str)
                    
                    # Make timezone-aware as UTC
                    start_datetime = timezone.make_aware(naive_start, timezone=pytz.UTC)
                    end_datetime = timezone.make_aware(naive_end, timezone=pytz.UTC)
                
                # Log the parsed datetimes for debugging
                logger.info(f"Parsed start_datetime: {start_datetime}")
                logger.info(f"Parsed end_datetime: {end_datetime}")
                
                # Validate that end_datetime is after start_datetime
                if end_datetime <= start_datetime:
                    return Response(
                        {'error': 'End time must be after start time'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
            except (ValueError, TypeError, AttributeError) as e:
                logger.error(f"Datetime parsing error: {str(e)}")
                return Response(
                    {'error': f'Invalid datetime format: {str(e)}. Use ISO format (YYYY-MM-DDTHH:MM:SS)'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check for overlapping bookings
            overlapping_bookings = Booking.objects.filter(
                place=place,
                start_time__lt=end_datetime,
                end_time__gt=start_datetime
            )
            
            if overlapping_bookings.exists():
                return Response(
                    {'error': 'This time period overlaps with existing bookings'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check for overlapping blocked periods (excluding booking blocks)
            overlapping_blocks = BlockedPeriod.objects.filter(
                place=place,
                block_type__in=['owner-block', 'maintenance'],  # Only merge owner blocks and maintenance
                start_datetime__lte=end_datetime,  # Changed from start_datetime__lt=end_datetime
                end_datetime__gte=start_datetime    # Changed from end_datetime__gt=start_datetime
            )

            # Check if the new block is completely contained within an existing block
            fully_contained_blocks = [
                block for block in overlapping_blocks 
                if block.start_datetime <= start_datetime and block.end_datetime >= end_datetime
            ]

            # If the new block is fully contained within existing blocks, don't create a new one
            if fully_contained_blocks:
                # Return the first containing block with a message
                containing_block = fully_contained_blocks[0]
                serializer = BlockedPeriodSerializer(containing_block)
                return Response({
                    **serializer.data,
                    'merged': False,
                    'contained': True,
                    'message': 'This time period is already blocked'
                }, status=status.HTTP_200_OK)

            # If there are overlapping blocks but none fully contain the new block, merge them
            if overlapping_blocks.exists():
                # Store the IDs of blocks that will be deleted
                deleted_block_ids = list(overlapping_blocks.values_list('id', flat=True))
                
                # Find the earliest start and latest end times
                earliest_start = start_datetime
                latest_end = end_datetime
                
                for block in overlapping_blocks:
                    if block.start_datetime < earliest_start:
                        earliest_start = block.start_datetime
                    if block.end_datetime > latest_end:
                        latest_end = block.end_datetime
                
                # Get the block type and reason
                block_type = request.data.get('block_type', 'owner-block')
                
                # Create a combined reason if needed
                reasons = [block.reason for block in overlapping_blocks if block.reason]
                new_reason = request.data.get('reason', '')
                if new_reason:
                    reasons.append(new_reason)
                
                combined_reason = "; ".join(filter(None, reasons)) or new_reason
                
                # Delete all overlapping blocks
                overlapping_blocks.delete()
                
                # Create a new merged block
                blocked_period = BlockedPeriod.objects.create(
                    place=place,
                    start_datetime=earliest_start,
                    end_datetime=latest_end,
                    block_type=block_type,
                    reason=combined_reason,
                    is_recurring=request.data.get('is_recurring', False),
                    recurring_pattern=request.data.get('recurring_pattern'),
                    recurring_end_date=request.data.get('recurring_end_date')
                )
                
                serializer = BlockedPeriodSerializer(blocked_period)
                return Response({
                    **serializer.data,
                    'merged': True,
                    'deleted_block_ids': deleted_block_ids,
                    'message': f'Merged with {len(deleted_block_ids)} existing block(s)'
                }, status=status.HTTP_201_CREATED)
            
            # No overlaps, create the blocked period normally
            blocked_period = BlockedPeriod.objects.create(
                place=place,
                start_datetime=start_datetime,
                end_datetime=end_datetime,
                block_type=request.data.get('block_type', 'owner-block'),
                reason=request.data.get('reason', ''),
                is_recurring=request.data.get('is_recurring', False),
                recurring_pattern=request.data.get('recurring_pattern'),
                recurring_end_date=request.data.get('recurring_end_date')
            )
            
            serializer = BlockedPeriodSerializer(blocked_period)
            return Response({
                **serializer.data,
                'merged': False
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            logger.error(f"Error creating blocked period: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def blocked_period_detail(request, blocked_period_id):
    """Get, update or delete a specific blocked period"""
    try:
        blocked_period = BlockedPeriod.objects.get(id=blocked_period_id)
        
        # Check if user is the owner of the place
        if blocked_period.place.owner != request.user:
            return Response(
                {'error': 'You do not have permission to access this blocked period'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if this is a booking-related block (can't be modified directly)
        if blocked_period.block_type == 'booking' and blocked_period.booking is not None:
            return Response(
                {'error': 'This blocked period is associated with a booking and cannot be modified directly'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if request.method == 'GET':
            serializer = BlockedPeriodSerializer(blocked_period)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            # Parse start and end times if provided
            if 'start_datetime' in request.data or 'end_datetime' in request.data:
                start_datetime = request.data.get('start_datetime', blocked_period.start_datetime.isoformat())
                end_datetime = request.data.get('end_datetime', blocked_period.end_datetime.isoformat())
                
                try:
                    start_datetime = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
                    end_datetime = datetime.fromisoformat(end_datetime.replace('Z', '+00:00'))
                    
                    # Check if end time is after start time
                    if end_datetime <= start_datetime:
                        return Response(
                            {'error': 'End time must be after start time'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Check for overlapping bookings
                    overlapping_bookings = Booking.objects.filter(
                        place=blocked_period.place,
                        start_time__lt=end_datetime,
                        end_time__gt=start_datetime
                    )
                    
                    if overlapping_bookings.exists():
                        return Response(
                            {'error': 'This time period overlaps with existing bookings'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                except ValueError:
                    return Response(
                        {'error': 'Invalid datetime format'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            serializer = BlockedPeriodSerializer(blocked_period, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            blocked_period.delete()
            return Response(
                {'message': 'Blocked period deleted successfully'},
                status=status.HTTP_200_OK
            )
    
    except BlockedPeriod.DoesNotExist:
        return Response(
            {'error': 'Blocked period not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error handling blocked period {blocked_period_id}: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def check_availability(request):
    """Check if a parking space is available during a specific time period"""
    place_id = request.query_params.get('place_id')
    start_datetime = request.query_params.get('start_datetime')
    end_datetime = request.query_params.get('end_datetime')
    
    if not all([place_id, start_datetime, end_datetime]):
        return Response(
            {'error': 'place_id, start_datetime, and end_datetime are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        place = Place.objects.get(id=place_id)
        
        # Parse datetimes
        try:
            start_datetime = datetime.fromisoformat(start_datetime.replace('Z', '+00:00'))
            end_datetime = datetime.fromisoformat(end_datetime.replace('Z', '+00:00'))
        except ValueError:
            return Response(
                {'error': 'Invalid datetime format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if end time is after start time
        if end_datetime <= start_datetime:
            return Response(
                {'error': 'End time must be after start time', 'available': False},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for overlapping blocked periods (non-recurring)
        overlapping_blocks = BlockedPeriod.objects.filter(
            place=place,
            is_recurring=False,
            start_datetime__lt=end_datetime,
            end_datetime__gt=start_datetime
        )
        
        # For simplicity, we'll just check if there are any overlapping blocks
        if overlapping_blocks.exists():
            block = overlapping_blocks.first()
            return Response({
                'available': False,
                'reason': block.reason or f"Space is unavailable: {block.get_block_type_display()}"
            })
        
        # Check for overlapping recurring blocks
        recurring_blocks = BlockedPeriod.objects.filter(
            place=place,
            is_recurring=True
        )
        
        if recurring_blocks.exists():
            # Get the day of week for the requested start date
            request_start_day = start_datetime.weekday()  # 0=Monday, 6=Sunday
            request_end_day = end_datetime.weekday()
            request_start_date = start_datetime.date()
            request_end_date = end_datetime.date()
            
            for block in recurring_blocks:
                # Skip if the recurring block has ended
                if block.recurring_end_date and request_start_date > block.recurring_end_date:
                    continue
                    
                # Skip if the recurring block starts after the requested date
                block_start_date = block.start_datetime.date()
                if block_start_date > request_end_date:
                    continue
                
                # If the request spans multiple days, we need to check each day
                current_date = request_start_date
                while current_date <= request_end_date:
                    current_day = current_date.weekday()
                    
                    # Check if the pattern applies to this day
                    applies = False
                    
                    if block.recurring_pattern == 'daily':
                        applies = True
                    
                    elif block.recurring_pattern == 'weekly':
                        # Check if it's the same day of the week
                        block_day = block.start_datetime.weekday()
                        applies = (current_day == block_day)
                    
                    elif block.recurring_pattern == 'weekdays':
                        # Monday to Friday (0-4)
                        applies = (current_day < 5)
                    
                    elif block.recurring_pattern == 'weekends':
                        # Saturday and Sunday (5-6)
                        applies = (current_day >= 5)
                    
                    # If the pattern applies, check time overlap
                    if applies:
                        # Create datetime objects for the block times on the requested date
                        block_start_time = block.start_datetime.time()
                        block_end_time = block.end_datetime.time()
                        
                        block_start = datetime.combine(current_date, block_start_time)
                        block_end = datetime.combine(current_date, block_end_time)
                        
                        # Check for overlap with the requested time range
                        if (block_start < end_datetime and block_end > start_datetime):
                            return Response({
                                'available': False,
                                'reason': block.reason or f"Space is unavailable due to recurring block: {block.get_block_type_display()}"
                            })
                    
                    # Move to the next day
                    current_date += timedelta(days=1)
        
        # If we get here, the space is available
        return Response({'available': True})
    
    except Place.DoesNotExist:
        return Response(
            {'error': 'Parking space not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error checking availability: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
