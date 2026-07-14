from django.urls import path
from . import views

urlpatterns = [
    path('api/dishes/', views.getDishes, name='get_dishes_url'),
]