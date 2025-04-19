from django.urls import path, include

urlpatterns = [
    path('', include('places.place.urls')),
    path('images/', include('places.place_image.urls')),
    path('blocked-periods/', include('places.blocked_period.urls')),
    path('bookings/', include('places.booking.urls')),
]