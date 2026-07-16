from django.urls import path
from . import views

urlpatterns = [
    path('api/dishes/', views.getDishes, name='get_dishes_url'),
    path('api/create-checkout-session/', views.createCheckoutSession, name='create_checkout_session_url'),
    path('api/create-order/', views.createOrder, name='create_order_url'),
    path('api/stripe-webhook/', views.stripeWebhook, name='stripe_webhook_url')
]