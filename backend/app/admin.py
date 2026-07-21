from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import RestaurantConfig, OpeningHour, Dish, Allergen, Order, OrderItem, Rating, ContactMessage, Coupon, DailySoup, DailyMeal

@admin.register(RestaurantConfig)
class RestaurantConfigAdmin(ModelAdmin):
    list_display = [
        "id",
        "is_force_closed",
        "closure_reason"
    ]

    list_filter = []

    search_fields = []

    list_editable = [
        "is_force_closed",
        "closure_reason"
    ]

@admin.register(OpeningHour)
class OpeningHourAdmin(ModelAdmin):
    list_display = [
        "id",
        "day_of_week",
        "open_time",
        "close_time",
        "is_closed_all_day"
    ]

    list_filter = [
        "day_of_week",
        "open_time",
        "close_time",
        "is_closed_all_day"
    ]

    search_fields = []

    list_editable = [
        "day_of_week",
        "open_time",
        "close_time",
        "is_closed_all_day"
    ]


@admin.register(Dish)
class DishAdmin(ModelAdmin):
    list_display = [
        "id",
        "title",
        "description", 
        "price", 
        "image"
    ]

    list_filter = [ 
        "price"
    ]

    search_fields = [
        "title", 
        "description"
    ]

    list_editable = [
        "title",
        "description", 
        "price", 
        "image"
    ]

@admin.register(Allergen)
class AllergenAdmin(ModelAdmin):
    list_display = [
        "id",
        "number", 
        "name"
    ]

    list_filter = [
        "number", 
        "name"
    ]

    search_fields = [
        "name"
    ]

    list_editable = [
        "number",
        "name"
    ]

@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = [
        "tracking_code",
        "first_name", 
        "last_name", 
        "address",
        "city",
        "phone_number",
        "message",
        "price",
        "total_price",
        "status", 
        "cash_on_delivery",
        "creation_time"
    ]

    list_filter = [
        "status", 
        "creation_time"
    ]

    search_fields = [
        "first_name", 
        "last_name"
    ]

    list_editable = [
        "status"
    ]

@admin.register(OrderItem)
class OrderItemAdmin(ModelAdmin):
    list_display = [
        "id",
        "order", 
        "dish", 
        "quantity",
        "price_at_purchase",
        "is_tip"
    ]

    list_filter = [
        "dish", 
        "is_tip"
    ]

    search_fields = [
        "order",
    ]

    list_editable = []

@admin.register(Rating)
class RatingAdmin(ModelAdmin):
    list_display = [
        "id",
        "order", 
        "dish", 
        "rating",
        "creation_time"
    ]

    list_filter = [
        "dish", 
        "rating",
        "creation_time"
    ]

    search_fields = [
        "dish",
    ]

    list_editable = []

@admin.register(ContactMessage)
class ContactMessageAdmin(ModelAdmin):
    list_display = [
        "id",
        "first_name", 
        "last_name", 
        "email_address",
        "message",
        "creation_time"
    ]

    list_filter = [
        "email_address", 
        "creation_time"
    ]

    search_fields = [
        "first_name",
        "last_name",
        "email_address"
    ]

    list_editable = []

@admin.register(Coupon)
class CouponAdmin(ModelAdmin):
    list_display = [
        "id",
        "code", 
        "discount_percent", 
        "is_active",
        "valid_until",
        "creation_time"
    ]

    list_filter = [
        "discount_percent",
        "is_active",
        "valid_until", 
        "creation_time"
    ]

    search_fields = [
        "code"
    ]

    list_editable = [
        "code", 
        "discount_percent", 
        "is_active",
        "valid_until"
    ]

@admin.register(DailySoup)
class DailySoupAdmin(ModelAdmin):
    list_display = [
        "id",
        "title",
        "day_of_week", 
        "is_active"
    ]

    list_filter = [
        "day_of_week", 
        "is_active"
    ]

    list_editable = [
        "title",
        "day_of_week", 
        "is_active"
    ]

@admin.register(DailyMeal)
class DailyMealAdmin(ModelAdmin):
    list_display = [
        "id",
        "number", 
        "title", 
        "price", 
        "day_of_week", 
        "is_active"
    ]

    list_filter = [
        "day_of_week", 
        "is_active"
    ]

    list_editable = [
        "number", 
        "title",
        "price", 
        "day_of_week", 
        "is_active"
    ]