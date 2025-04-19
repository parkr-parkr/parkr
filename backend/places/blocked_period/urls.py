from django.urls import path
from . import views

urlpatterns = [
    path('', views.blocked_periods, name='blocked-periods'),
    path('<int:blocked_period_id>/', views.blocked_period_detail, name='blocked-period-detail'),
]