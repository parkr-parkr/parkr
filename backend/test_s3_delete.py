import os
import django
import boto3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings

def test_s3_delete():
    """Test direct deletion from S3"""
    print("=== Testing S3 Deletion ===")
    
    # Get AWS credentials from settings
    aws_access_key_id = settings.AWS_ACCESS_KEY_ID
    aws_secret_access_key = settings.AWS_SECRET_ACCESS_KEY
    aws_storage_bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    aws_s3_region_name = getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
    
    print(f"AWS Settings:")
    print(f"  Bucket: {aws_storage_bucket_name}")
    print(f"  Region: {aws_s3_region_name}")
    print(f"  Access Key: {aws_access_key_id[:4]}...{aws_access_key_id[-4:] if len(aws_access_key_id) > 8 else ''}")
    
    # Create S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        region_name=aws_s3_region_name
    )
    
    # Test key to delete - REPLACE WITH YOUR ACTUAL KEY
    test_key = "listings/13/bocchi rock_74daad92.jpg"
    
    # Try with different key formats
    keys_to_try = [
        test_key,
        f"{test_key}",
        # Add other variations if needed
    ]
    
    for key in keys_to_try:
        print(f"\nTrying to delete key: {key}")
        
        # Check if the object exists
        try:
            s3_client.head_object(Bucket=aws_storage_bucket_name, Key=key)
            print(f"  Object exists in S3")
            
            # Try to delete the object
            try:
                response = s3_client.delete_object(
                    Bucket=aws_storage_bucket_name,
                    Key=key
                )
                print(f"  Delete response: {response}")
                print(f"  SUCCESS: Object deleted")
            except Exception as e:
                print(f"  ERROR deleting object: {str(e)}")
        
        except s3_client.exceptions.ClientError as e:
            if e.response['Error']['Code'] == '404':
                print(f"  Object does not exist in S3")
            else:
                print(f"  ERROR checking object: {str(e)}")
    
    # List objects in the bucket with the prefix
    prefix = "listings/13/"
    print(f"\nListing objects with prefix: {prefix}")
    
    try:
        response = s3_client.list_objects_v2(
            Bucket=aws_storage_bucket_name,
            Prefix=prefix
        )
        
        if 'Contents' in response:
            print(f"Found {len(response['Contents'])} objects:")
            for obj in response['Contents']:
                print(f"  {obj['Key']} (Size: {obj['Size']} bytes)")
        else:
            print("No objects found with this prefix")
    
    except Exception as e:
        print(f"ERROR listing objects: {str(e)}")

if __name__ == "__main__":
    test_s3_delete()