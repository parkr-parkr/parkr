from django.urls import path
from . import views

urlpatterns = [
    path('', views.add_image, name='add_image'),
    path('<int:image_id>/', views.delete_image, name='delete_image'),
    path('<int:image_id>/set-primary/', views.set_primary_image, name='set_primary_image'),
]