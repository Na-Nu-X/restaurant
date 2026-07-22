from django.contrib import admin
from django.urls import path, include
import os
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path(os.environ.get('ADMIN_URL'), admin.site.urls), # Admin Page
    path('', include('app.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)