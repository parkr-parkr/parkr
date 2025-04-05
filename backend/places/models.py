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

class Availability(models.Model):
    """Model for representing the availability of a parking space."""
    place = models.ForeignKey(Place, related_name='availabilities', on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    
    class Meta:
        verbose_name_plural = "Availabilities"

    def __str__(self):
        return f"{self.place.name}: {self.start_time} - {self.end_time}"

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
