from django.urls import path
from . import views

urlpatterns = [
    path('list-driveway/', views.list_driveway, name='list-driveway'),
    path('my-listings/', views.get_users_listings, name='my-listings'),
    path('listings/<int:listing_id>/', views.listing, name='listing'),
]

