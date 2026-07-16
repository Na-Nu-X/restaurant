from django.urls import path
from . import views

urlpatterns = [
    path('api/dishes/', views.getDishes, name='get_dishes_url'),
    path('api/create-checkout-session/', views.create_checkout_session, name='create-checkout-session'),
    path('api/stripe-webhook/', views.stripeWebhook, name='stripe_webhook_url')
]