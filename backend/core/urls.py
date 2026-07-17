from django.contrib import admin
from django.urls import path, include
import os

urlpatterns = [
    path(os.environ.get('ADMIN_URL'), admin.site.urls), # Admin Page
    path('', include('app.urls')),
]