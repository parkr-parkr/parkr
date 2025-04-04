from rest_framework import viewsets, permissions, status, parsers
from rest_framework.decorators import api_view, permission_classes, action, parser_classes
from rest_framework.response import Response
from .models import Place, PlaceImage
from .serializers import PlaceSerializer, PlaceImageSerializer
from django.db import transaction
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .s3_service import s3_service  # Import the S3 service


class PlaceViewSet(viewsets.ModelViewSet):
    """ViewSet for the Place model."""
    serializer_class = PlaceSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    
    def get_queryset(self):
        """Return places based on filters"""
        queryset = Place.objects.all()
        
      
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        
        state = self.request.query_params.get('state')
        if state:
            queryset = queryset.filter(state__icontains=state)
        

        zip_code = self.request.query_params.get('zip_code')
        if zip_code:
            queryset = queryset.filter(zip_code__icontains=zip_code)
        

        
        return queryset
    
    def get_permissions(self):
        """Return appropriate permissions based on action"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]
    
    def perform_create(self, serializer):
        """Create a new place and handle images"""
        with transaction.atomic():
            # Save the place first
            place = serializer.save(owner=self.request.user)
            
            # Handle image uploads
            images = []
            photo_count = int(self.request.data.get('photo_count', 0))
            
            for i in range(1, photo_count + 1):
                photo_key = f'photo_{i}'
                if photo_key in self.request.FILES:
                    image = self.request.FILES[photo_key]
                    # Set the first image as primary
                    is_primary = i == 1
                    
                    # Upload the image to S3
                    directory = f"listings/{place.id}"
                    image_key = s3_service.upload_file(image, directory=directory)
                    
                    # Create the PlaceImage with the S3 key
                    place_image = PlaceImage.objects.create(
                        place=place,
                        image_key=image_key,
                        is_primary=is_primary
                    )
                    images.append(place_image)
    
    @action(detail=False, methods=['get'])
    def my_listings(self, request):
        """Endpoint to get the current user's listings"""
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        listings = Place.objects.filter(owner=request.user)
        serializer = self.get_serializer(listings, many=True)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser]) 
def list_driveway(request):
    """Endpoint for listing a driveway"""
    try:
        # Print detailed request information for debugging
        print("\n--- LIST DRIVEWAY REQUEST ---")
        print(f"Content-Type: {request.META.get('CONTENT_TYPE', 'Not provided')}")
        print(f"Request method: {request.method}")
        print(f"Request data: {request.data}")
        print(f"Request FILES: {request.FILES}")
        print("--- END REQUEST INFO ---\n")
        
        # Create a clean copy of the data without is_active
        data = {}
        for key, value in request.data.items():
            if key != 'is_active':
                data[key] = value
        
        # Create serializer with the clean data
        serializer = PlaceSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            with transaction.atomic():
                # Save the place with the owner
                place = serializer.save(owner=request.user)
                
                # Handle image uploads
                images = []
                photo_count = int(request.data.get('photo_count', 0))
                
                for i in range(1, photo_count + 1):
                    photo_key = f'photo_{i}'
                    if photo_key in request.FILES:
                        image = request.FILES[photo_key]
                        # Set the first image as primary
                        is_primary = i == 1
                        
                        # Upload the image to S3
                        directory = f"listings/{place.id}"
                        image_key = s3_service.upload_file(image, directory=directory)
                        
                        # Create the PlaceImage with the S3 key
                        place_image = PlaceImage.objects.create(
                            place=place,
                            image_key=image_key,
                            is_primary=is_primary
                        )
                        
                        print(f"Uploaded image to S3: {image_key}")
                        print(f"Image URL: {place_image.url}")
                        
                        images.append(place_image)
                
                # Return the created place with images
                place_serializer = PlaceSerializer(place, context={'request': request})
                return Response(place_serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        print("Exception in list_driveway:", str(e))
        print(traceback.format_exc())
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_listings(request):
    """Endpoint to get the current user's listings"""
    listings = Place.objects.filter(owner=request.user)
    serializer = PlaceSerializer(listings, many=True, context={'request': request})
    return Response(serializer.data)