from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Place, Booking
from .serializers import PlaceSerializer, BookingSerializer

class PlaceViewSet(viewsets.ModelViewSet):
    serializer_class = PlaceSerializer
    
    def get_queryset(self):
        return Place.objects.all()
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Booking.objects.all()
        return Booking.objects.filter(user=user)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def search_places(request):
    query = request.GET.get('query', '')
    places = Place.objects.filter(
        city__icontains=query
    ) | Place.objects.filter(
        state__icontains=query
    ) | Place.objects.filter(
        zip_code__icontains=query
    )
    serializer = PlaceSerializer(places, many=True)
    return Response(serializer.data)

