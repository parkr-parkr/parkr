from django.db import models
from django.conf import settings
from .s3_service import s3_service
import logging
import uuid

logger = logging.getLogger(__name__)

def listing_image_path(instance, filename):
    """Generate a unique path for listing images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"listings/{str(instance.place.id)}/{filename}"

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

    def __str__(self):
        return self.name
    
class Booking(models.Model):
    """Model for representing bookings of parking spaces."""
    place = models.ForeignKey(Place, related_name='bookings', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    booking_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-booking_time']

    def __str__(self):
        return f"{self.user.email} booked {self.place.name} from {self.start_time} to {self.end_time}"

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
    
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='blocked_periods')
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    block_type = models.CharField(max_length=20, choices=BLOCK_TYPES)
    reason = models.CharField(max_length=255, blank=True)
    
    # For recurring blocks
    is_recurring = models.BooleanField(default=False)
    recurring_pattern = models.CharField(max_length=10, choices=RECURRING_PATTERNS, null=True, blank=True)
    recurring_end_date = models.DateField(null=True, blank=True)
    
    # If this is a booking, reference the booking
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, null=True, blank=True, related_name='blocked_period')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['place', 'start_datetime']),
            models.Index(fields=['place', 'end_datetime']),
            models.Index(fields=['is_recurring']),
        ]
    
    def __str__(self):
        return f"{self.place.name}: {self.start_datetime} - {self.end_datetime} ({self.get_block_type_display()})"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Validate that end time is after start time
        if self.end_datetime <= self.start_datetime:
            raise ValidationError("End time must be after start time")
        
        # Validate recurring pattern is set if is_recurring is True
        if self.is_recurring and not self.recurring_pattern:
            raise ValidationError("Recurring pattern must be set for recurring blocks")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)



class PlaceImage(models.Model):
    place = models.ForeignKey(Place, related_name='images', on_delete=models.CASCADE)
    image_key = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def url(self):
        """Get the URL for this image."""
        if self.image_key:
            return s3_service.get_url(self.image_key)
        return None
    
    def delete(self, *args, **kwargs):
        logger.info(f"Deleting image from S3: {self.image_key}")
        
        try:
           s3_service.delete_file(self.image_key)
        except Exception as e:
            logger.error(f"Error deleting image from S3: {str(e)}")

        super(PlaceImage, self).delete(*args, **kwargs)
