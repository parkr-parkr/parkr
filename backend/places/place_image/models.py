from django.db import models
import uuid
import logging
from places.s3_service import s3_service

logger = logging.getLogger(__name__)

def listing_image_path(instance, filename):
    """Generate a unique path for listing images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"listings/{str(instance.place.id)}/{filename}"

class PlaceImage(models.Model):
    """Model for storing images associated with a place"""
    place = models.ForeignKey('places.Place', on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to=listing_image_path, null=True, blank=True)
    image_key = models.CharField(max_length=255, blank=True)  # For S3 storage
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'places'

    def __str__(self):
        return f"Image for {self.place.name}"

    @property
    def url(self):
        """Get the URL for the image"""
        if self.image_key:
            return s3_service.get_url(self.image_key)
        elif self.image:
            return self.image.url
        return None

    def delete(self, *args, **kwargs):
        """Override delete to also remove the image from S3"""
        if self.image_key:
            try:
                s3_service.delete_file(self.image_key)
            except Exception as e:
                logger.error(f"Error deleting image from S3: {str(e)}", exc_info=True)
        super().delete(*args, **kwargs)
    
    def set_as_primary(self):
        """Set this image as the primary image for its place"""
        # Set all other images for this place as non-primary
        PlaceImage.objects.filter(place=self.place, is_primary=True).update(is_primary=False)
        
        # Set this image as primary
        self.is_primary = True
        self.save()
        
        return True
    
    @classmethod
    def add_image_to_place(cls, place, image_file, is_primary=False):
        """
        Add a new image to a place
        
        Args:
            place: The Place object to add the image to
            image_file: The uploaded image file
            is_primary: Whether this should be the primary image
            
        Returns:
            PlaceImage: The created image object
        """
        # Upload the image to S3
        directory = f"listings/{place.id}"
        image_key = s3_service.upload_file(image_file, directory=directory)
        
        # If this should be primary, set all other images as non-primary
        if is_primary:
            cls.objects.filter(place=place, is_primary=True).update(is_primary=False)
        
        # Create the PlaceImage with the S3 key
        place_image = cls.objects.create(
            place=place,
            image_key=image_key,
            is_primary=is_primary
        )
        
        logger.info(f"Added image to place {place.id}: {image_key}")
        
        return place_image
    
    @classmethod
    def delete_all_for_place(cls, place):
        """
        Delete all images associated with a place and clean up S3
        
        Args:
            place: The Place object whose images should be deleted
            
        Returns:
            tuple: (success_count, failed_images) where failed_images is a list of failed image IDs
        """
        images = cls.objects.filter(place=place)
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