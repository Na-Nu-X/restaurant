from django.urls import path
from . import views

urlpatterns = [
    path('api/dishes/', views.getDishes, name='get_dishes_url'),
    path('api/create-checkout-session/', views.createCheckoutSession, name='create_checkout_session_url'),
    path('api/create-order/', views.createOrder, name='create_order_url'),
    path('api/stripe-webhook/', views.stripeWebhook, name='stripe_webhook_url'),
    path('api/order-status/<str:tracking_code>/', views.getOrderStatus, name='get_order_status_url'),
    path('api/ordered-items/<int:id>/', views.getOrderedItems, name='get_ordered_items_url'),
    path('api/send-rating/', views.sendRating, name='send_rating_url'),
    path('api/contact/', views.sendMessage, name='send_message_url')
]