from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import logging

from .models import Booking
from .serializers import BookingSerializer

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_booking(request):
    """Create a new booking"""
    place_id = request.data.get('place_id')
    start_time_str = request.data.get('start_time')
    end_time_str = request.data.get('end_time')
    
    if not all([place_id, start_time_str, end_time_str]):
        return Response(
            {'error': 'place_id, start_time, and end_time are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        from places.place.models import Place
        place = Place.objects.get(id=place_id)
        
        # Parse datetimes using the model method
        try:
            start_time = Booking.parse_datetime(start_time_str)
            end_time = Booking.parse_datetime(end_time_str)
        except ValueError:
            return Response(
                {'error': 'Invalid datetime format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the booking using the place's method
        booking, success, message = place.create_booking(
            user=request.user,
            start_datetime=start_time,
            end_datetime=end_time
        )
        
        if success:
            serializer = BookingSerializer(booking)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
    
    except Place.DoesNotExist:
        return Response(
            {'error': 'Parking space not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error creating booking: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_bookings(request):
    """Get all bookings for the current user with optional filtering"""
    status_filter = request.query_params.get('status')
    upcoming_only = request.query_params.get('upcoming', 'false').lower() == 'true'
    past_only = request.query_params.get('past', 'false').lower() == 'true'
    
    # Use the model class method to get filtered bookings
    bookings = Booking.get_user_bookings(
        user=request.user,
        status=status_filter,
        upcoming_only=upcoming_only,
        past_only=past_only
    )
    
    serializer = BookingSerializer(bookings, many=True)
    return Response(serializer.data)

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def booking_detail(request, booking_id):
    """Get, update, or delete a specific booking"""
    try:
        booking = Booking.objects.get(id=booking_id)
        
        # Check if user is authorized (either the booker or the place owner)
        if booking.user != request.user and booking.place.owner != request.user:
            return Response(
                {'error': 'You do not have permission to access this booking'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'GET':
            serializer = BookingSerializer(booking)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            # Only allow status updates
            new_status = request.data.get('status')
            if not new_status:
                return Response(
                    {'error': 'Status is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use the model method to update status
            success, message = booking.update_status(new_status)
            
            if success:
                serializer = BookingSerializer(booking)
                return Response(serializer.data)
            else:
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            # Only allow cancellation, not actual deletion
            success, message = booking.cancel()
            if success:
                return Response({'message': message}, status=status.HTTP_200_OK)
            else:
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
    
    except Booking.DoesNotExist:
        return Response(
            {'error': 'Booking not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error handling booking {booking_id}: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)