import json
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from .models import Coupon, OpeningHour, Rating, Dish, DishModifierGroup, DishModifierItem, Order, OrderItem, OrderItemModifier
from .ordering import OrderValidationError, buildOrderDraft


class OrderTestData(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.pizza = Dish.objects.create(title="Pizza", description="Popis", price=900, image="dishes/pizza.jpg")
        cls.salad = Dish.objects.create(title="Šalát", description="Popis", price=650, image="dishes/salad.jpg")

        cls.size = DishModifierGroup.objects.create(dish=cls.pizza, title="Veľkosť", is_multiple_choice=False, is_required=True)
        cls.small = DishModifierItem.objects.create(group=cls.size, title="32 cm", extra_price=0)
        cls.large = DishModifierItem.objects.create(group=cls.size, title="45 cm", extra_price=400)

        cls.extras = DishModifierGroup.objects.create(dish=cls.pizza, title="Extra", is_multiple_choice=True, is_required=False)
        cls.cheese = DishModifierItem.objects.create(group=cls.extras, title="Syr navyše", extra_price=120)

        salad_group = DishModifierGroup.objects.create(dish=cls.salad, title="Dresing", is_multiple_choice=False, is_required=False)
        cls.dressing = DishModifierItem.objects.create(group=salad_group, title="Jogurtový", extra_price=50)

        Coupon.objects.create(code="LETO10", discount_percent=10, is_active=True)
        Coupon.objects.create(code="STARY", discount_percent=50, is_active=True, valid_until=timezone.now() - timedelta(days=1))


class BuildOrderDraftTests(OrderTestData):
    def test_prices_come_from_the_database_not_from_the_browser(self):
        draft = buildOrderDraft([{"id": self.pizza.id, "price": 1, "quantity": 2, "modifier_ids": [self.large.id, self.cheese.id]}])

        line = draft.lines[0]
        self.assertEqual(line.unit_price, 900 + 400 + 120)
        self.assertEqual(draft.items_total, (900 + 400 + 120) * 2)
        self.assertEqual(line.modifiers_label, "45 cm, Syr navyše")

    def test_reads_options_from_carts_saved_by_the_previous_version(self):
        draft = buildOrderDraft([{"id": self.pizza.id, "quantity": 1, "selected_modifiers": [{"id": self.small.id, "title": "x", "extra_price": 999}]}])

        self.assertEqual(draft.lines[0].unit_price, 900)

    def test_requires_a_choice_in_required_groups(self):
        with self.assertRaisesMessage(OrderValidationError, "chýba povinný výber"):
            buildOrderDraft([{"id": self.pizza.id, "quantity": 1, "modifier_ids": []}])

    def test_allows_only_one_choice_in_single_choice_groups(self):
        with self.assertRaisesMessage(OrderValidationError, "len jednu možnosť"):
            buildOrderDraft([{"id": self.pizza.id, "quantity": 1, "modifier_ids": [self.small.id, self.large.id]}])

    def test_rejects_options_of_another_dish(self):
        with self.assertRaises(OrderValidationError):
            buildOrderDraft([{"id": self.pizza.id, "quantity": 1, "modifier_ids": [self.small.id, self.dressing.id]}])

    def test_rejects_unknown_dishes_and_bad_quantities(self):
        with self.assertRaises(OrderValidationError):
            buildOrderDraft([{"id": 999999, "quantity": 1}])

        with self.assertRaises(OrderValidationError):
            buildOrderDraft([{"id": self.salad.id, "quantity": 0}])

    def test_applies_the_coupon_to_dishes_but_not_to_the_tip(self):
        draft = buildOrderDraft(
            [{"id": self.salad.id, "quantity": 1}, {"id": -1, "price": 200, "quantity": 1}],
            coupon_code="leto10"
        )

        self.assertEqual(draft.items_total, 585)
        self.assertEqual(draft.tip_total, 200)

    def test_rounds_discounted_prices_half_up(self):
        dish = Dish.objects.create(title="Polievka", description="", price=1005, image="dishes/soup.jpg")
        draft = buildOrderDraft([{"id": dish.id, "quantity": 1}], coupon_code="LETO10")

        self.assertEqual(draft.lines[0].unit_price, 905) # 904.5 → 905 (Python's round() Would Give 904)

    def test_ignores_expired_coupons(self):
        draft = buildOrderDraft([{"id": self.salad.id, "quantity": 1}], coupon_code="STARY")

        self.assertEqual(draft.items_total, 650)

    def test_drops_the_tip_for_cash_orders(self):
        draft = buildOrderDraft([{"id": self.salad.id, "quantity": 1}, {"id": -1, "price": 200}], include_tip=False)

        self.assertEqual(draft.tip_total, 0)

    def test_rejects_an_empty_cart_or_a_cart_with_only_a_tip(self):
        with self.assertRaises(OrderValidationError):
            buildOrderDraft([])

        with self.assertRaises(OrderValidationError):
            buildOrderDraft([{"id": -1, "price": 200}])


@patch("app.views._checkOpen", return_value=None)
class CreateOrderViewTests(OrderTestData):
    customer = {"first_name": "Ján", "last_name": "Novák", "address": "Hlavná 1", "city": "Bratislava", "phone_number": "+421900000000", "message": None}

    def post(self, url, payload):
        return self.client.post(url, data=json.dumps(payload), content_type="application/json")

    def test_cash_order_stores_the_chosen_options(self, _open):
        response = self.post("/api/create-order/", {
            "items": [{"id": self.pizza.id, "quantity": 2, "price": 1, "modifier_ids": [self.large.id, self.cheese.id]}],
            "customer": self.customer
        })

        self.assertEqual(response.status_code, 200)

        order = Order.objects.get(tracking_code=response.json()["tracking_code"])
        item = order.items.get()

        self.assertEqual(order.status, "PREPARING")
        self.assertEqual(order.total_price, (900 + 400 + 120) * 2)
        self.assertEqual(item.price_at_purchase, 1420)
        self.assertEqual(sorted(item.modifiers.values_list("title", flat=True)), ["45 cm", "Syr navyše"])

    def test_invalid_cart_returns_a_readable_message_and_saves_nothing(self, _open):
        response = self.post("/api/create-order/", {"items": [{"id": self.pizza.id, "quantity": 1}], "customer": self.customer})

        self.assertEqual(response.status_code, 400)
        self.assertIn("chýba povinný výber", response.json()["message"])
        self.assertFalse(Order.objects.exists())

    @patch("app.views.stripe.checkout.Session.create")
    def test_card_checkout_sends_the_options_to_stripe(self, create_session, _open):
        create_session.return_value = SimpleNamespace(id="cs_test_123", url="https://checkout.stripe.test/123")

        response = self.post("/api/create-checkout-session/", {
            "items": [
                {"id": self.pizza.id, "quantity": 1, "modifier_ids": [self.small.id, self.cheese.id]},
                {"id": -1, "price": 150, "quantity": 1}
            ],
            "customer": self.customer
        })

        self.assertEqual(response.status_code, 200)
        line_items = create_session.call_args.kwargs["line_items"]

        self.assertEqual(line_items[0]["price_data"]["product_data"]["description"], "32 cm, Syr navyše")
        self.assertEqual(line_items[0]["price_data"]["unit_amount"], 1020)
        self.assertEqual(line_items[1]["price_data"]["unit_amount"], 150)

        order = Order.objects.get()
        self.assertEqual(order.status, "PENDING")
        self.assertEqual(order.total_price, 1020 + 150)
        self.assertEqual(order.stripe_intent_id, "cs_test_123")
        self.assertEqual(OrderItemModifier.objects.count(), 2)

    @patch("app.views.stripe.checkout.Session.create", side_effect=Exception("Stripe is down"))
    def test_failed_stripe_call_does_not_leave_an_order_behind(self, _create_session, _open):
        response = self.post("/api/create-checkout-session/", {
            "items": [{"id": self.salad.id, "quantity": 1}],
            "customer": self.customer
        })

        self.assertEqual(response.status_code, 500)
        self.assertFalse(Order.objects.exists())
        self.assertFalse(OrderItem.objects.exists())

    def test_order_status_includes_items_options_and_tip(self, _open):
        create_session = patch("app.views.stripe.checkout.Session.create", return_value=SimpleNamespace(id="cs_test_1", url="https://stripe.test")).start()
        self.addCleanup(patch.stopall)

        self.post("/api/create-checkout-session/", {
            "items": [{"id": self.pizza.id, "quantity": 2, "modifier_ids": [self.large.id]}, {"id": -1, "price": 250}],
            "customer": self.customer
        })

        order = Order.objects.get()
        order.status = "COMPLETED"
        order.save()
        Rating.objects.create(order=order, dish=self.pizza, rating=4)

        details = self.client.get(f"/api/order-status/{order.tracking_code.lower()}/").json()["order_details"]

        self.assertEqual(details["tip"], 250)
        self.assertEqual(details["price"], 1300 * 2)
        self.assertEqual(len(details["items"]), 1)
        self.assertEqual(details["items"][0]["modifiers"], ["45 cm"])
        self.assertEqual(details["items"][0]["unit_price"], 1300)
        self.assertEqual(details["items"][0]["rating"], 4)
        self.assertTrue(create_session.called)

    def test_unknown_tracking_code_returns_404(self, _open):
        self.assertEqual(self.client.get("/api/order-status/NOPE00/").status_code, 404)

class OpeningHoursViewTests(TestCase):
    def test_returns_the_week_ordered_by_day(self):
        OpeningHour.objects.create(day_of_week=3, open_time="10:00", close_time="22:00")
        OpeningHour.objects.create(day_of_week=1, open_time="11:30", close_time="21:00")
        OpeningHour.objects.create(day_of_week=7, open_time="00:00", close_time="00:00", is_closed_all_day=True)

        data = self.client.get("/api/opening-hours/").json()

        self.assertEqual([day["day_of_week"] for day in data["opening_hours"]], [1, 3, 7])
        self.assertEqual(data["opening_hours"][0]["open_time"], "11:30")
        self.assertTrue(data["opening_hours"][2]["is_closed_all_day"])
        self.assertIn(data["today"], range(1, 8))


class OrderAdminTests(OrderTestData):
    def setUp(self):
        from django.contrib.auth import get_user_model

        self.admin = get_user_model().objects.create_superuser("admin", "admin@example.com", "heslo-12345")
        self.client.force_login(self.admin)

        self.today_order = Order.objects.create(first_name="Ján", last_name="Novák", address="Hlavná 1", city="BA", phone_number="1", price=900, total_price=1000, status="PREPARING")
        item = OrderItem.objects.create(order=self.today_order, dish=self.pizza, quantity=2, price_at_purchase=1300)
        OrderItemModifier.objects.create(order_item=item, modifier_item=self.large, title="45 cm", extra_price=400)

        self.old_order = Order.objects.create(first_name="Eva", last_name="Malá", address="Dlhá 2", city="BA", phone_number="2", price=500, total_price=500, status="COMPLETED")
        Order.objects.filter(id=self.old_order.id).update(creation_time=timezone.now() - timedelta(days=3))

    def changelist(self, **params):
        from django.urls import reverse
        return self.client.get(reverse("admin:app_order_changelist"), params)

    def test_list_shows_badges_items_and_newest_first(self):
        response = self.changelist()
        content = response.content.decode()

        self.assertEqual(response.status_code, 200)
        self.assertIn("2× Pizza (45 cm)", content)
        self.assertIn("Pripravuje sa", content)
        self.assertLess(content.index(self.today_order.tracking_code), content.index(self.old_order.tracking_code))

    def test_today_and_active_filters(self):
        today = self.changelist(obdobie="dnes").content.decode()
        self.assertIn(self.today_order.tracking_code, today)
        self.assertNotIn(self.old_order.tracking_code, today)

        closed = self.changelist(aktivne="nie").content.decode()
        self.assertIn(self.old_order.tracking_code, closed)
        self.assertNotIn(self.today_order.tracking_code, closed)

    def test_bulk_status_action(self):
        from django.urls import reverse

        self.client.post(reverse("admin:app_order_changelist"), {
            "action": "mark_delivering",
            "_selected_action": [self.today_order.id]
        })

        self.today_order.refresh_from_db()
        self.assertEqual(self.today_order.status, "DELIVERING")

    def test_detail_page_lists_items_with_options(self):
        from django.urls import reverse

        response = self.client.get(reverse("admin:app_order_change", args=[self.today_order.id]))

        self.assertEqual(response.status_code, 200)
        self.assertIn("45 cm", response.content.decode())
        self.assertIn("26,00 €", response.content.decode())
