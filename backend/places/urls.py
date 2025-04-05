from django.urls import path
from . import views

urlpatterns = [
    path('list-driveway/', views.list_driveway, name='list-driveway'),
<<<<<<< HEAD
    path('my-listings/', views.my_listings, name='my-listings'),
    path('get-listings-by-location/', views.get_places_by_location, name='get-listings-by-location'),
=======
    path('my-listings/', views.get_users_listings, name='my-listings'),
>>>>>>> master
]

