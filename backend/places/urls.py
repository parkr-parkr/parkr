from django.urls import path
from . import views

urlpatterns = [
    path('list-driveway/', views.list_driveway, name='list-driveway'),
    path('my-listings/', views.get_users_listings, name='my-listings'),
    path('listings/<int:listing_id>/', views.listing, name='listing'),
    path('get-listings-by-location/', views.get_places_by_location, name='get-listings-by-location'),
    path('images/', views.add_image, name='add_image'),
    path('images/<int:image_id>/', views.delete_image, name='delete_image'),
    path('images/<int:image_id>/set-primary/', views.set_primary_image, name='set_primary_image'),
]

