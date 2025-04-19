from django.urls import path
from . import views

urlpatterns = [
    path('', views.create_booking, name='create-booking'),
    path('my-bookings/', views.get_user_bookings, name='my-bookings'),
    path('<int:booking_id>/', views.booking_detail, name='booking-detail'),
]