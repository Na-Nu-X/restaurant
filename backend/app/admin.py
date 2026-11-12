from datetime import timedelta

from django.contrib import admin, messages
from django.db.models import Prefetch
from django.utils import timezone
from unfold.decorators import action, display
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
    fields = ["item", "options", "quantity", "unit_price", "line_total"]
    readonly_fields = ["item", "options", "quantity", "unit_price", "line_total"]
    verbose_name = "Položka"
    verbose_name_plural = "Položky objednávky"

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description="Položka")
    def item(self, obj):
        if obj.is_tip:
            return "Prepitné"

        return obj.dish.title if obj.dish else "Zmazané jedlo"

    @admin.display(description="Zvolené možnosti")
    def options(self, obj):
        return ", ".join(modifier.title for modifier in obj.modifiers.all()) or "—"

    @admin.display(description="Cena / ks")
    def unit_price(self, obj):
        return formatPrice(obj.price_at_purchase)

    @admin.display(description="Spolu")
    def line_total(self, obj):
        return formatPrice(obj.price_at_purchase * obj.quantity)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("dish", "order").prefetch_related("modifiers")

class OrderItemModifierInline(TabularInline):
    model = OrderItemModifier
    extra = 0
    fields = ["title", "extra_price", "modifier_item"]
    readonly_fields = ["title", "extra_price", "modifier_item"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

def formatPrice(cents):
    """Formats Cents As A Price, e.g. 1250 -> "12,50 €"."""
    return f"{cents / 100:,.2f} €".replace(",", " ").replace(".", ",")

ACTIVE_STATUSES = ["PENDING", "PAID", "PREPARING", "DELIVERING"]

# Badge Colors Of The Order Statuses (Unfold Label Types)
STATUS_COLORS = {
    "PENDING": "warning",
    "PAID": "info",
    "PREPARING": "primary",
    "DELIVERING": "info",
    "COMPLETED": "success",
    "CANCELLED": "danger"
}

class OrderPeriodFilter(admin.SimpleListFilter):
    title = "Obdobie"
    parameter_name = "obdobie"

    def lookups(self, request, model_admin):
        return [
            ("dnes", "Dnes"),
            ("vcera", "Včera"),
            ("tyzden", "Posledných 7 dní")
        ]

    def queryset(self, request, queryset):
        today = timezone.localdate()

        if self.value() == "dnes":
            return queryset.filter(creation_time__date=today)

        if self.value() == "vcera":
            return queryset.filter(creation_time__date=today - timedelta(days=1))

        if self.value() == "tyzden":
            return queryset.filter(creation_time__date__gte=today - timedelta(days=6))

        return queryset

class ActiveOrderFilter(admin.SimpleListFilter):
    title = "Aktívne objednávky"
    parameter_name = "aktivne"

    def lookups(self, request, model_admin):
        return [
            ("ano", "Aktívne (čakajú, pripravujú sa, na ceste)"),
            ("nie", "Uzavreté (doručené, zrušené)")
        ]

    def queryset(self, request, queryset):
        if self.value() == "ano":
            return queryset.filter(status__in=ACTIVE_STATUSES)

        if self.value() == "nie":
            return queryset.exclude(status__in=ACTIVE_STATUSES)

        return queryset

@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = [
        "tracking_code",
        "status_badge",
        "customer",
        "items_summary",
        "total_display",
        "payment_badge",
        "creation_time"
    ]

    list_display_links = [
        "tracking_code",
        "customer"
    ]

    list_filter = [
        OrderPeriodFilter,
        ActiveOrderFilter,
        "status",
        "cash_on_delivery"
    ]

    search_fields = [
        "tracking_code",
        "first_name", 
        "last_name",
        "phone_number",
        "address"
    ]

    ordering = ["-creation_time"]
    list_per_page = 50

    readonly_fields = [
        "tracking_code",
        "creation_time",
        "price_display",
        "tip_display",
        "total_display",
        "stripe_intent_id"
    ]

    fieldsets = [
        ("Objednávka", {"fields": ["tracking_code", "status", "cash_on_delivery", "creation_time"]}),
        ("Zákazník a doručenie", {"fields": ["first_name", "last_name", "phone_number", "address", "city", "message"]}),
        ("Cena", {"fields": ["price_display", "tip_display", "total_display", "stripe_intent_id"]})
    ]

    actions = [
        "mark_preparing",
        "mark_delivering",
        "mark_completed",
        "mark_cancelled"
    ]

    inlines = [OrderItemInline]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related(
            Prefetch("items", queryset=OrderItem.objects.select_related("dish").prefetch_related("modifiers"))
        )

    @display(description="Stav", ordering="status", label=STATUS_COLORS)
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @display(description="Platba", label={"Dobierka": "warning", "Karta": "info"})
    def payment_badge(self, obj):
        return "Dobierka" if obj.cash_on_delivery else "Karta"

    @display(description="Zákazník", header=True)
    def customer(self, obj):
        return f"{obj.first_name} {obj.last_name}", obj.phone_number

    @display(description="Položky")
    def items_summary(self, obj):
        lines = []

        for item in obj.items.all():
            if item.is_tip:
                continue

            title = item.dish.title if item.dish else "Zmazané jedlo"
            options = ", ".join(modifier.title for modifier in item.modifiers.all())
            lines.append(f"{item.quantity}× {title}" + (f" ({options})" if options else ""))

        return "; ".join(lines) or "—"

    @display(description="Jedlo (po zľave)")
    def price_display(self, obj):
        return formatPrice(obj.price)

    @display(description="Prepitné")
    def tip_display(self, obj):
        return formatPrice(obj.total_price - obj.price)

    @display(description="Spolu", ordering="total_price")
    def total_display(self, obj):
        return formatPrice(obj.total_price)

    def _setStatus(self, request, queryset, status):
        updated = queryset.update(status=status)
        label = dict(Order.STATUS_CHOICES)[status]
        self.message_user(request, f"Stav „{label}“ bol nastavený pri {updated} objednávkach.", messages.SUCCESS)

    @action(description="Označiť ako: Pripravuje sa")
    def mark_preparing(self, request, queryset):
        self._setStatus(request, queryset, "PREPARING")

    @action(description="Označiť ako: Na ceste")
    def mark_delivering(self, request, queryset):
        self._setStatus(request, queryset, "DELIVERING")

    @action(description="Označiť ako: Doručená")
    def mark_completed(self, request, queryset):
        self._setStatus(request, queryset, "COMPLETED")

    @action(description="Označiť ako: Zrušená")
    def mark_cancelled(self, request, queryset):
        self._setStatus(request, queryset, "CANCELLED")

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