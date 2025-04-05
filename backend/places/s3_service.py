# s3_service.py
import boto3
import os
import uuid
from django.conf import settings

class S3Service:
    def __init__(self, bucket_name=None, region=None):
        """Initialize the S3 service with settings from Django or environment."""
        self.bucket_name = bucket_name or settings.AWS_STORAGE_BUCKET_NAME
        self.region = region or settings.AWS_S3_REGION_NAME
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        
        # Initialize S3 client
        self.client = boto3.client(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region
        )
    
    def upload_file(self, file_obj, directory='media', filename=None):
        """
        Upload a file to S3 and return the key.
        
        Args:
            file_obj: A file-like object or bytes
            directory: The directory within the bucket (default: 'media')
            filename: The filename to use (default: auto-generated UUID)
            
        Returns:
            The S3 key of the uploaded file
        """
        # Generate a unique filename if not provided
        if filename is None:
            if hasattr(file_obj, 'name'):
                # Use the original filename but add a UUID to ensure uniqueness
                original_name = os.path.basename(file_obj.name)
                name, ext = os.path.splitext(original_name)
                filename = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
            else:
                filename = f"{uuid.uuid4().hex}.bin"
        
        # Create the full key (path within the bucket)
        key = f"{directory}/{filename}" if directory else filename
        
        # Get the file content
        if hasattr(file_obj, 'read'):
            content = file_obj.read()
            # Reset file pointer if possible
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)
        else:
            content = file_obj
        
        # Determine content type (you might want to expand this)
        content_type = 'application/octet-stream'
        if hasattr(file_obj, 'content_type'):
            content_type = file_obj.content_type
        elif filename.lower().endswith(('.jpg', '.jpeg')):
            content_type = 'image/jpeg'
        elif filename.lower().endswith('.png'):
            content_type = 'image/png'
        elif filename.lower().endswith('.gif'):
            content_type = 'image/gif'
        
        # Upload the file with public-read ACL
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=content,
            ContentType=content_type,
            ACL='public-read'
        )
        
        return key
    
    def get_url(self, key):
        """
        Get the URL for an S3 object.
        
        Args:
            key: The S3 key (path within the bucket)
            
        Returns:
            The URL of the S3 object
        """
        return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}"
    
    def delete_file(self, key):
        """
        Delete a file from S3.
        
        Args:
            key: The S3 key (path within the bucket)
        """
        self.client.delete_object(
            Bucket=self.bucket_name,
            Key=key
        )
        
    
    def list_files(self, directory=''):
        """
        List files in a directory.
        
        Args:
            directory: The directory within the bucket (default: root)
            
        Returns:
            A list of S3 keys
        """
        response = self.client.list_objects_v2(
            Bucket=self.bucket_name,
            Prefix=directory
        )
        
        if 'Contents' in response:
            return [obj['Key'] for obj in response['Contents']]
        return []

# Create a singleton instance for easy import
s3_service = S3Service()