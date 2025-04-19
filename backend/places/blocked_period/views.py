from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import logging

from .models import BlockedPeriod
from .serializers import BlockedPeriodSerializer
from places.place.models import Place
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

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
            
            # Parse dates if provided
            if start_date and end_date:
                try:
                    start_date = BlockedPeriod.parse_datetime(start_date)
                    end_date = BlockedPeriod.parse_datetime(end_date)
                except ValueError:
                    return Response(
                        {'error': 'Invalid date format'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Use model method to get filtered blocked periods
            blocked_periods = BlockedPeriod.get_for_place(place, start_date, end_date)
            
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
            
            # Parse datetime strings
            try:
                start_datetime = BlockedPeriod.parse_datetime(request.data.get('start_datetime'))
                end_datetime = BlockedPeriod.parse_datetime(request.data.get('end_datetime'))
                
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
            
            # Use model method to create block with overlap handling
            try:
                blocked_period, result_info = BlockedPeriod.create_block(
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
                response_data = {**serializer.data, **result_info}
                
                if result_info.get('contained', False):
                    return Response(response_data, status=status.HTTP_200_OK)
                else:
                    return Response(response_data, status=status.HTTP_201_CREATED)
                
            except ValidationError as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        except Exception as e:
            logger.error(f"Error creating blocked period: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def blocked_period_detail(request, blocked_period_id):
    """Get, update or delete a specific blocked period"""
    try:
        blocked_period = BlockedPeriod.objects.get(id=blocked_period_id)
        
        # Check if user can modify this block
        if not blocked_period.can_be_modified_by(request.user):
            if blocked_period.is_booking_block():
                return Response(
                    {'error': 'This blocked period is associated with a booking and cannot be modified directly'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                return Response(
                    {'error': 'You do not have permission to access this blocked period'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        if request.method == 'GET':
            serializer = BlockedPeriodSerializer(blocked_period)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            # Parse start and end times if provided
            if 'start_datetime' in request.data or 'end_datetime' in request.data:
                try:
                    start_datetime = BlockedPeriod.parse_datetime(
                        request.data.get('start_datetime', blocked_period.start_datetime.isoformat())
                    )
                    end_datetime = BlockedPeriod.parse_datetime(
                        request.data.get('end_datetime', blocked_period.end_datetime.isoformat())
                    )
                    
                    # Check if end time is after start time
                    if end_datetime <= start_datetime:
                        return Response(
                            {'error': 'End time must be after start time'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Check for booking conflicts
                    has_conflicts, conflict_message = BlockedPeriod.check_booking_conflicts(
                        blocked_period.place, start_datetime, end_datetime
                    )
                    if has_conflicts:
                        return Response(
                            {'error': conflict_message},
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