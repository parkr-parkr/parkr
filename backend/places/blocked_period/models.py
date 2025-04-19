from django.db import models
from django.core.exceptions import ValidationError
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class BlockedPeriod(models.Model):
    """
    Model for storing when a parking space is NOT available.
    By default, spaces are always available unless blocked.
    """
    BLOCK_TYPES = (
        ('owner-block', 'Owner Block'),
        ('maintenance', 'Maintenance'),
        ('booking', 'Booking'),
    )
    
    RECURRING_PATTERNS = (
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('weekdays', 'Weekdays'),
        ('weekends', 'Weekends'),
    )
    
    place = models.ForeignKey('places.Place', on_delete=models.CASCADE, related_name='blocked_periods')
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    block_type = models.CharField(max_length=20, choices=BLOCK_TYPES)
    reason = models.CharField(max_length=255, blank=True)
    
    # If this is a booking, reference the booking
    booking = models.OneToOneField('places.Booking', on_delete=models.CASCADE, null=True, blank=True, related_name='blocked_period')
    
    # For recurring blocks
    is_recurring = models.BooleanField(default=False)
    recurring_pattern = models.CharField(max_length=20, choices=RECURRING_PATTERNS, null=True, blank=True)
    recurring_end_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['place', 'start_datetime']),
            models.Index(fields=['place', 'end_datetime']),
        ]
        app_label = 'places'
    
    def __str__(self):
        return f"{self.place.name}: {self.start_datetime} - {self.end_datetime} ({self.get_block_type_display()})"
    
    def clean(self):
        """Validate that end time is after start time"""
        if self.end_datetime <= self.start_datetime:
            raise ValidationError("End time must be after start time")
        
        # Validate that recurring_pattern is provided if is_recurring is True
        if self.is_recurring and not self.recurring_pattern:
            raise ValidationError("Recurring pattern must be provided for recurring blocks")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def is_booking_block(self):
        """Check if this is a booking-related block"""
        return self.block_type == 'booking' and self.booking is not None
    
    def can_be_modified_by(self, user):
        """Check if this block can be modified by the given user"""
        # Only the place owner can modify blocks
        return self.place.owner == user and not self.is_booking_block()
    
    def overlaps_with(self, start_datetime, end_datetime):
        """Check if this block overlaps with the given time period"""
        return (self.start_datetime < end_datetime and 
                self.end_datetime > start_datetime)
    
    def contains(self, start_datetime, end_datetime):
        """Check if this block fully contains the given time period"""
        return (self.start_datetime <= start_datetime and 
                self.end_datetime >= end_datetime)
    
    @classmethod
    def get_for_place(cls, place, start_date=None, end_date=None):
        """
        Get blocked periods for a place, optionally filtered by date range
        
        Args:
            place: The place to get blocked periods for
            start_date: Optional start date for filtering
            end_date: Optional end date for filtering
            
        Returns:
            QuerySet of BlockedPeriod objects
        """
        blocked_periods = cls.objects.filter(place=place)
        
        if start_date and end_date:
            # Get non-recurring blocks that overlap with the date range
            date_range_blocks = blocked_periods.filter(
                is_recurring=False,
                start_datetime__lt=end_date,
                end_datetime__gt=start_date
            )
            
            # Get recurring blocks
            recurring_blocks = blocked_periods.filter(is_recurring=True)
            
            # Combine the querysets
            return date_range_blocks | recurring_blocks
        
        return blocked_periods
    
    @classmethod
    def parse_datetime(cls, datetime_str):
        """
        Parse a datetime string with timezone handling
        Returns a datetime object
        """
        if not datetime_str:
            return None
            
        # Handle ISO format with timezone info
        if 'Z' in datetime_str or '+' in datetime_str or '-' in datetime_str:
            # Already has timezone info, just parse it
            return datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
        else:
            # No timezone info, treat as UTC
            from django.utils import timezone
            import pytz
            
            # Parse as naive datetime then make timezone-aware
            naive_dt = datetime.fromisoformat(datetime_str)
            
            # Make timezone-aware as UTC
            return timezone.make_aware(naive_dt, timezone=pytz.UTC)
    
    @classmethod
    def check_booking_conflicts(cls, place, start_datetime, end_datetime):
        """
        Check if there are any booking conflicts for the given time period
        
        Returns:
            (bool, str) - (has_conflicts, error_message)
        """
        from places.booking.models import Booking
        
        overlapping_bookings = Booking.objects.filter(
            place=place,
            start_time__lt=end_datetime,
            end_time__gt=start_datetime
        )
        
        if overlapping_bookings.exists():
            return True, "This time period overlaps with existing bookings"
        
        return False, None
    
    @classmethod
    def find_overlapping_blocks(cls, place, start_datetime, end_datetime, exclude_booking_blocks=True):
        """
        Find blocks that overlap with the given time period
        
        Args:
            place: The place to check
            start_datetime: Start of the time period
            end_datetime: End of the time period
            exclude_booking_blocks: Whether to exclude booking blocks
            
        Returns:
            QuerySet of overlapping BlockedPeriod objects
        """
        query = cls.objects.filter(
            place=place,
            start_datetime__lte=end_datetime,
            end_datetime__gte=start_datetime
        )
        
        if exclude_booking_blocks:
            query = query.filter(block_type__in=['owner-block', 'maintenance'])
            
        return query
    
    @classmethod
    def create_block(cls, place, start_datetime, end_datetime, block_type='owner-block', 
                    reason='', is_recurring=False, recurring_pattern=None, recurring_end_date=None):
        """
        Create a new blocked period, handling overlaps and merges
        
        Returns:
            (blocked_period, result_info) - The created/found block and info about the operation
        """
        # Check for booking conflicts
        has_conflicts, conflict_message = cls.check_booking_conflicts(place, start_datetime, end_datetime)
        if has_conflicts:
            raise ValidationError(conflict_message)
        
        # Check for overlapping blocks
        overlapping_blocks = cls.find_overlapping_blocks(place, start_datetime, end_datetime)
        
        # Check if the new block is completely contained within an existing block
        fully_contained_blocks = [
            block for block in overlapping_blocks 
            if block.contains(start_datetime, end_datetime)
        ]
        
        # If the new block is fully contained within existing blocks, don't create a new one
        if fully_contained_blocks:
            # Return the first containing block
            containing_block = fully_contained_blocks[0]
            return containing_block, {
                'merged': False,
                'contained': True,
                'message': 'This time period is already blocked'
            }
        
        # If there are overlapping blocks, merge them
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
            
            # Create a combined reason if needed
            reasons = [block.reason for block in overlapping_blocks if block.reason]
            if reason:
                reasons.append(reason)
            
            combined_reason = "; ".join(filter(None, reasons)) or reason
            
            # Delete all overlapping blocks
            overlapping_blocks.delete()
            
            # Create a new merged block
            blocked_period = cls.objects.create(
                place=place,
                start_datetime=earliest_start,
                end_datetime=latest_end,
                block_type=block_type,
                reason=combined_reason,
                is_recurring=is_recurring,
                recurring_pattern=recurring_pattern,
                recurring_end_date=recurring_end_date
            )
            
            return blocked_period, {
                'merged': True,
                'deleted_block_ids': deleted_block_ids,
                'message': f'Merged with {len(deleted_block_ids)} existing block(s)'
            }
        
        # No overlaps, create the blocked period normally
        blocked_period = cls.objects.create(
            place=place,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            block_type=block_type,
            reason=reason,
            is_recurring=is_recurring,
            recurring_pattern=recurring_pattern,
            recurring_end_date=recurring_end_date
        )
        
        return blocked_period, {
            'merged': False,
            'message': 'Block created successfully'
        }