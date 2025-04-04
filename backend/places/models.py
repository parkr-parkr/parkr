from django.db import models
from django.conf import settings
from .s3_service import s3_service
import uuid

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
    price_per_hour = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name

class PlaceImage(models.Model):
    place = models.ForeignKey(Place, related_name='images', on_delete=models.CASCADE)
    image_key = models.CharField(max_length=255, blank=True)  # Make it nullable
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def url(self):
        """Get the URL for this image."""
        if self.image_key:
            return s3_service.get_url(self.image_key)
        elif self.image:
            # Fall back to the old image URL if available
            return self.image.url
        return None
    
    def delete(self, *args, **kwargs):
        """Override delete to also remove the file from S3."""
        # Delete the file from S3
        s3_service.delete_file(self.image_key)
        # Call the parent delete method
        super().delete(*args, **kwargs)
    
    def __str__(self):
        return f"Image for {self.place.name}"
