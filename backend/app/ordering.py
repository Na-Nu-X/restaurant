"""
Validation And Pricing Of Orders

The prices sent by the browser are never trusted: the unit price of every dish
is the dish price plus the surcharges of the chosen options, read from the
database. Only the tip amount comes from the customer.
"""

from dataclasses import dataclass, field

from django.db import transaction
from django.utils import timezone

from .models import Coupon, Dish, DishModifierItem, Order, OrderItem, OrderItemModifier

TIP_ITEM_ID = -1 # The Front-End Sends The Tip As A Pseudo Cart Item With This ID
MAX_QUANTITY = 50 # Maximum Quantity Of One Cart Line
MAX_TIP = 100_00 # Maximum Tip In Cents


class OrderValidationError(Exception):
    """Raised When The Cart Cannot Be Turned Into An Order. The Message Is Shown To The Customer."""


@dataclass
class OrderLine:
    dish:Dish|None # None For The Tip
    title:str
    quantity:int
    unit_price:int # In Cents, After The Discount (Tips Are Never Discounted)
    modifiers:list[DishModifierItem] = field(default_factory=list)
    is_tip:bool = False

    @property
    def total(self) -> int:
        return self.unit_price * self.quantity

    @property
    def modifiers_label(self) -> str:
        return ", ".join(modifier.title for modifier in self.modifiers)


@dataclass
class OrderDraft:
    lines:list[OrderLine]
    discount_percent:int

    @property
    def items_total(self) -> int:
        """Price Of The Dishes After The Discount (Without The Tip)."""
        return sum(line.total for line in self.lines if not line.is_tip)

    @property
    def tip_total(self) -> int:
        return sum(line.total for line in self.lines if line.is_tip)


def getDiscountPercent(coupon_code) -> int:
    """Returns The Discount Of An Active, Not Expired Coupon (0 Otherwise)."""
    if not coupon_code:
        return 0

    coupon = Coupon.objects.filter(code__iexact=str(coupon_code).strip(), is_active=True).first()

    if coupon and (not coupon.valid_until or coupon.valid_until > timezone.now()):
        return coupon.discount_percent

    return 0


def applyDiscount(price:int, discount_percent:int) -> int:
    """Discounted Price In Cents, Rounded Half Up With Integer Math (Same Formula As The Front-End)."""
    return (price * (100 - discount_percent) + 50) // 100


def _parseInt(value, default=None):
    try:
        return int(value)

    except (TypeError, ValueError):
        return default


def _selectedModifierIds(item) -> list[int]:
    """Reads The Chosen Options Of A Cart Item (`modifier_ids`, Or `selected_modifiers` From Older Saved Carts)."""
    raw_ids = item.get("modifier_ids")

    if raw_ids is None:
        raw_ids = [modifier.get("id") for modifier in item.get("selected_modifiers") or [] if isinstance(modifier, dict)]

    ids = [_parseInt(modifier_id) for modifier_id in raw_ids]

    if any(modifier_id is None for modifier_id in ids):
        raise OrderValidationError("Vybrané možnosti jedla nie sú platné.")

    return sorted(set(ids))


def _validateModifiers(dish:Dish, modifier_ids:list[int]) -> list[DishModifierItem]:
    """Checks That The Options Belong To The Dish And Follow The Rules Of Their Groups."""
    modifiers = list(
        DishModifierItem.objects.filter(id__in=modifier_ids, group__dish=dish).select_related("group").order_by("group_id", "id")
    )

    if len(modifiers) != len(modifier_ids):
        raise OrderValidationError(f"Niektoré možnosti jedla „{dish.title}“ už nie sú dostupné. Pridajte ho prosím do košíka znova.")

    for group in dish.modifier_groups.all():
        chosen = [modifier for modifier in modifiers if modifier.group_id == group.id]

        if group.is_required and not chosen:
            raise OrderValidationError(f"Pri jedle „{dish.title}“ chýba povinný výber: {group.title}.")

        if not group.is_multiple_choice and len(chosen) > 1:
            raise OrderValidationError(f"Pri jedle „{dish.title}“ je v skupine „{group.title}“ možné vybrať len jednu možnosť.")

    return modifiers


def buildOrderDraft(items, coupon_code=None, include_tip=True) -> OrderDraft:
    """Turns The Cart Sent By The Front-End Into Validated Order Lines With Prices From The Database."""
    if not isinstance(items, list) or not items:
        raise OrderValidationError("Košík je prázdny.")

    discount_percent = getDiscountPercent(coupon_code)

    dish_ids = {_parseInt(item.get("id")) for item in items if isinstance(item, dict)}
    dishes = Dish.objects.prefetch_related("modifier_groups").in_bulk([dish_id for dish_id in dish_ids if dish_id and dish_id > 0])

    lines = []

    for item in items:
        if not isinstance(item, dict):
            raise OrderValidationError("Košík obsahuje neplatnú položku.")

        item_id = _parseInt(item.get("id"))

        # Tip (Only For Card Payments)
        if item_id == TIP_ITEM_ID:
            if not include_tip:
                continue

            amount = _parseInt(item.get("price"), 0)

            if amount <= 0:
                continue

            lines.append(OrderLine(dish=None, title="Prepitné", quantity=1, unit_price=min(amount, MAX_TIP), is_tip=True))
            continue

        dish = dishes.get(item_id)

        if dish is None:
            raise OrderValidationError("Niektoré jedlo z košíka už nie je v ponuke. Odstráňte ho prosím z košíka.")

        quantity = _parseInt(item.get("quantity"), 1)

        if quantity < 1 or quantity > MAX_QUANTITY:
            raise OrderValidationError(f"Množstvo jedla „{dish.title}“ musí byť od 1 do {MAX_QUANTITY}.")

        modifiers = _validateModifiers(dish, _selectedModifierIds(item))
        base_price = dish.price + sum(modifier.extra_price for modifier in modifiers)

        lines.append(OrderLine(
            dish=dish,
            title=dish.title,
            quantity=quantity,
            unit_price=applyDiscount(base_price, discount_percent),
            modifiers=modifiers
        ))

    if not any(not line.is_tip for line in lines):
        raise OrderValidationError("Košík je prázdny.")

    return OrderDraft(lines=lines, discount_percent=discount_percent)


@transaction.atomic
def saveOrder(draft:OrderDraft, customer, status, cash_on_delivery) -> Order:
    """Saves The Order, Its Items And The Chosen Options."""
    customer = customer if isinstance(customer, dict) else {}

    order = Order.objects.create(
        first_name=str(customer.get("first_name") or "Neznáme")[:20],
        last_name=str(customer.get("last_name") or "Neznáme")[:50],
        address=str(customer.get("address") or "Neznáma")[:100],
        city=str(customer.get("city") or "Neznáme")[:50],
        phone_number=str(customer.get("phone_number") or "Neznáme")[:50],
        message=(str(customer.get("message"))[:100] if customer.get("message") else None),
        price=draft.items_total,
        total_price=draft.items_total + draft.tip_total,
        status=status,
        cash_on_delivery=cash_on_delivery
    )

    for line in draft.lines:
        order_item = OrderItem.objects.create(
            order=order,
            dish=line.dish,
            quantity=line.quantity,
            price_at_purchase=line.unit_price,
            is_tip=line.is_tip
        )

        OrderItemModifier.objects.bulk_create([
            OrderItemModifier(order_item=order_item, modifier_item=modifier, title=modifier.title, extra_price=modifier.extra_price)
            for modifier in line.modifiers
        ])

    return order
