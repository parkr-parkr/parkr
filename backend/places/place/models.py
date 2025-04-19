from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class Place(models.Model):
    """Model for driveway/parking space listings"""
    # Using default AutoField for id (Django will create this automatically)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='places')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    price_per_hour = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        app_label = 'places'

    def __str__(self):
        return self.name
    
    @classmethod
    def find_by_location(cls, latitude, longitude, latitude_range, longitude_range):
        """Find places within a geographic bounding box"""
        min_latitude = latitude - latitude_range / 2
        max_latitude = latitude + latitude_range / 2
        min_longitude = longitude - longitude_range / 2
        max_longitude = longitude + longitude_range / 2
        
        return cls.objects.filter(
            latitude__range=(min_latitude, max_latitude),
            longitude__range=(min_longitude, max_longitude)
        )
    
    def is_available(self, start_datetime, end_datetime):
        """
        Check if this place is available during the specified time period.
        Returns (bool, str) - (is_available, reason_if_not_available)
        """
        # Validate input
        if end_datetime <= start_datetime:
            return False, "End time must be after start time"
            
        # Check for any overlapping blocked periods
        from places.blocked_period.models import BlockedPeriod
        overlapping_blocks = BlockedPeriod.objects.filter(
            place=self,
            start_datetime__lt=end_datetime,
            end_datetime__gt=start_datetime
        )
        
        if overlapping_blocks.exists():
            block = overlapping_blocks.first()
            return False, f"Space is unavailable: {block.reason or block.get_block_type_display()}"
        
        # Check for recurring blocks that apply to this time period
        recurring_blocks = BlockedPeriod.objects.filter(place=self, is_recurring=True)
        
        for block in recurring_blocks:
            if self._recurring_block_applies(block, start_datetime, end_datetime):
                return False, f"Space is unavailable due to recurring block: {block.reason or block.get_block_type_display()}"
        
        return True, "Space is available"
    
    def _recurring_block_applies(self, block, start_datetime, end_datetime):
        """Helper method to check if a recurring block applies to a time period"""
        # Skip if the recurring block has ended
        if block.recurring_end_date and start_datetime.date() > block.recurring_end_date:
            return False
            
        # Check if the pattern applies to this day
        applies = False
        day_of_week = start_datetime.weekday()  # 0=Monday, 6=Sunday
        
        if block.recurring_pattern == 'daily':
            applies = True
        elif block.recurring_pattern == 'weekly':
            block_day = block.start_datetime.weekday()
            applies = (day_of_week == block_day)
        elif block.recurring_pattern == 'weekdays':
            applies = (day_of_week < 5)  # Monday to Friday (0-4)
        elif block.recurring_pattern == 'weekends':
            applies = (day_of_week >= 5)  # Saturday and Sunday (5-6)
        
        if not applies:
            return False
            
        # Check time overlap
        block_start_time = block.start_datetime.time()
        block_end_time = block.end_datetime.time()
        
        # Create datetime objects for the block times on the requested date
        block_start = datetime.combine(start_datetime.date(), block_start_time)
        block_end = datetime.combine(start_datetime.date(), block_end_time)
        
        # Check for overlap with the requested time range
        return (block_start < end_datetime and block_end > start_datetime)
    
    def create_booking(self, user, start_datetime, end_datetime, status='pending'):
        """
        Create a booking if the place is available.
        Returns (booking_obj, success, message)
        """
        # First check if the place is available
        is_available, reason = self.is_available(start_datetime, end_datetime)
        
        if not is_available:
            return None, False, reason
        
        # Calculate price based on duration and hourly rate
        duration_hours = (end_datetime - start_datetime).total_seconds() / 3600
        total_price = self.price_per_hour * Decimal(duration_hours)
        
        # Create the booking
        from places.booking.models import Booking
        booking = Booking.objects.create(
            place=self,
            user=user,
            start_time=start_datetime,
            end_time=end_datetime,
            total_price=total_price,
            status=status
        )
        
        # The Booking.save() method automatically creates a BlockedPeriod
        
        return booking, True, "Booking created successfully"
    
    def get_available_times(self, date):
        """
        Get all available time slots for a specific date.
        Returns a list of available time ranges as (start_datetime, end_datetime) tuples
        """
        # Start with the full day as available
        start_of_day = datetime.combine(date, datetime.min.time())
        end_of_day = datetime.combine(date, datetime.max.time())
        
        available_ranges = [(start_of_day, end_of_day)]
        
        # Get all blocked periods for this day
        from places.blocked_period.models import BlockedPeriod
        blocked_periods = BlockedPeriod.objects.filter(
            place=self,
            start_datetime__date__lte=date,
            end_datetime__date__gte=date
        )
        
        # Sort blocked periods by start time
        blocked_periods = sorted(blocked_periods, key=lambda x: x.start_datetime)
        
        # Remove blocked periods from available ranges
        for block in blocked_periods:
            new_available_ranges = []
            
            for avail_start, avail_end in available_ranges:
                # Case 1: Block is entirely before available range
                if block.end_datetime <= avail_start:
                    new_available_ranges.append((avail_start, avail_end))
                    continue
                    
                # Case 2: Block is entirely after available range
                if block.start_datetime >= avail_end:
                    new_available_ranges.append((avail_start, avail_end))
                    continue
                    
                # Case 3: Block overlaps with available range
                
                # If there's time before the block, add it
                if avail_start < block.start_datetime:
                    new_available_ranges.append((avail_start, block.start_datetime))
                    
                # If there's time after the block, add it
                if avail_end > block.end_datetime:
                    new_available_ranges.append((block.end_datetime, avail_end))
            
            available_ranges = new_available_ranges
        
        return available_ranges
    
    def add_images(self, files, photo_count):
        """
        Add images to this place from uploaded files
        Returns a list of created PlaceImage objects
        """
        from places.place_image.models import PlaceImage
        from places.s3_service import s3_service
        
        images = []
        
        for i in range(1, photo_count + 1):
            photo_key = f'photo_{i}'
            if photo_key in files:
                image = files[photo_key]
                # Set the first image as primary
                is_primary = i == 1

                # Upload the image to S3
                directory = f"listings/{self.id}"
                image_key = s3_service.upload_file(image, directory=directory)

                # Create the PlaceImage with the S3 key
                place_image = PlaceImage.objects.create(
                    place=self,
                    image_key=image_key,
                    is_primary=is_primary
                )

                logger.info(f"Uploaded image to S3: {image_key}")
                logger.info(f"Image URL: {place_image.url}")

                images.append(place_image)
                
        return images
    
    def delete_with_images(self):
        """Delete this place and all associated images"""
        from places.place_image.models import PlaceImage
        from places.s3_service import s3_service
        
        # Get all images for this place
        images = PlaceImage.objects.filter(place=self)
        
        success_count = 0
        failed_images = []
        
        # Delete each image and its S3 file
        for image in images:
            image_id = image.id
            image_key = getattr(image, 'image_key', None)
            
            try:
                # Delete from S3 if it has an image_key
                if image_key:
                    try:
                        s3_service.delete_file(image_key)
                    except Exception as e:
                        logger.error(f"Error deleting image from S3: {str(e)}", exc_info=True)
                
                # Delete the database record
                image.delete()
                success_count += 1
            except Exception as e:
                logger.error(f"Error deleting image {image_id}: {str(e)}", exc_info=True)
                failed_images.append(image_id)
        
        # Delete the place itself
        self.delete()
        
        return success_count, failed_images
    
    @classmethod
    def prepare_listing_data(cls, request_data):
        """
        Prepare and clean data for creating or updating a listing
        Returns cleaned data dictionary
        """
        from places.util.address_utils import AddressParser
        from places.util.location_utils import LocationParser
        
        # Create a clean copy of the data
        data = {}
        for key, value in request_data.items():
            if key == 'description' and (value == 'undefined' or value == 'null'):
                data[key] = ''  # Replace with empty string
            elif key != 'is_active':
                data[key] = value

        # Process address and location data
        AddressParser.fill_address_data(data)
        data = LocationParser.parse_location(data)
        
        return data
    
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