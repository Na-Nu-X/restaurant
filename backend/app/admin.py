from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import RestaurantConfig, OpeningHour, Dish, FilterGroup, Category, DishModifierGroup, DishModifierItem, Allergen, Order, OrderItem, OrderItemModifier, Rating, ContactMessage, Coupon, DailySoup, DailyMeal

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
        "category",
        "price", 
        "image"
    ]

    list_filter = [ 
        "category",
        "price"
    ]

    search_fields = [
        "title", 
        "description"
    ]

    list_editable = [
        "title",
        "description", 
        "category",
        "price", 
        "image"
    ]

@admin.register(FilterGroup)
class FilterGroupAdmin(ModelAdmin):
    list_display = [
        "id",
        "name"
    ]

    list_filter = [ 
        "name"
    ]

    search_fields = [
        "name"
    ]

    list_editable = [
        "name"
    ]

@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = [
        "id",
        "group",
        "name",
        "icon"
    ]

    list_filter = [ 
        "group",
        "name"
    ]

    search_fields = [
        "name"
    ]

    list_editable = [
        "group",
        "name",
        "icon"
    ]

@admin.register(DishModifierGroup)
class DishModifierGroupAdmin(ModelAdmin):
    list_display = [
        "id",
        "dish",
        "title", 
        "is_multiple_choice", 
        "is_required"
    ]

    list_filter = [ 
        "dish",
        "title",
        "is_multiple_choice",
        "is_required"
    ]

    search_fields = [
        "title"
    ]

    list_editable = [
        "dish",
        "title", 
        "is_multiple_choice", 
        "is_required"
    ]

@admin.register(DishModifierItem)
class DishModifierItemAdmin(ModelAdmin):
    list_display = [
        "id",
        "group",
        "title", 
        "extra_price"
    ]

    list_filter = [ 
        "group",
        "title", 
        "extra_price"
    ]

    search_fields = [
        "title"
    ]

    list_editable = [
        "group",
        "title", 
        "extra_price"
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

class OrderItemInline(TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    fields = ["dish", "options", "quantity", "price_at_purchase", "is_tip"]
    readonly_fields = ["dish", "options", "quantity", "price_at_purchase", "is_tip"]
    verbose_name = "Položka"
    verbose_name_plural = "Položky objednávky"

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description="Zvolené možnosti")
    def options(self, obj):
        return ", ".join(modifier.title for modifier in obj.modifiers.all()) or "—"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("dish").prefetch_related("modifiers")

class OrderItemModifierInline(TabularInline):
    model = OrderItemModifier
    extra = 0
    fields = ["title", "extra_price", "modifier_item"]
    readonly_fields = ["title", "extra_price", "modifier_item"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

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

    inlines = [OrderItemInline]

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
        "order__tracking_code",
    ]

    list_editable = []

    inlines = [OrderItemModifierInline]

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