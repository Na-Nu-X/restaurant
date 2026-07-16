from django.shortcuts import render
from django.http import JsonResponse
from .models import Dish, Order, OrderItem
import stripe
import json
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
import os
import urllib.parse
from django.http import HttpResponse

stripe.api_key = settings.STRIPE_SECRET_KEY

def getDishes(request):
    dishes = Dish.objects.all().values() # Gets All The Dishes

    # Sends The Data As A JSON Response
    return JsonResponse(
        list(dishes), 
        safe=False
    )

@csrf_exempt
def create_checkout_session(request):
    if request.method == "POST":
        try:
            # Gets The Data

            is_local = os.environ.get("IS_LOCAL", "True") == "True" # Gets The Information About Local Development
            front_end_domain = os.environ.get("FRONT_END_DOMAIN_URL", "http://localhost:4200/") # Gets The Front-End Domain URL

            data = json.loads(request.body) # Gets The Data
            items = data.get("items", []) # Gets The Items
            customer = data.get("customer", []) # Gets The Customer

            # Calculates The Price

            price = 0 # Stores The Price In Cents Without The Tip
            total_price = 0 # Stores The Total Price In Cents With The Tip

            for one_item in items:
                if one_item.get("id") and int(one_item.get("id")) != -1:
                    price += int(one_item.get("price", "0")) * int(one_item.get("quantity", "1"))

                total_price += int(one_item.get("price", "0")) * int(one_item.get("quantity", "1"))

            # Processes The Order

            # Saves The New Order
            new_order = Order.objects.create(
                first_name=customer.get("first_name", "Neznáme"),
                last_name=customer.get("last_name", "Neznáme"),
                address=customer.get("address", "Neznáma"),
                city=customer.get("city", "Neznáme"),
                phone_number=customer.get("phone_number", "Neznáme"),
                message=customer.get("message", None),
                price=price,
                total_price=total_price,
                status="PENDING"
            )

            line_items = [] # Stores All Items

            for one_item in items:
                image_name = one_item.get("image") # Gets THe Image Name

                if is_local:
                    title = one_item.get("title", "food") # Gets The Title
                    safe_title = urllib.parse.quote(title) # Creates The Clear Title
                    image_url = f"https://dummyimage.com/600x400/ff7f00/fff?text={safe_title}" # Generates Random Image

                else:
                    domain = os.environ.get("DOMAIN_URL", "localhost") # Gets The Domain
                    image_url = f"https://{domain}/static/images/{image_name}" # Gets The Image URL

                line_items.append({
                    "price_data": {
                        "currency": "eur",
                        "product_data": {
                            "name": one_item.get("title"),
                            "images": [image_url], 
                        },

                        "unit_amount": int(one_item.get("price")), 
                    },

                    "quantity": int(one_item.get("quantity", "1"))
                })

                # Saves The New Order
                OrderItem.objects.create(
                    order=new_order,
                    dish_id=int(one_item.get("id")) if one_item.get("id") and int(one_item.get("id")) != -1 else None,
                    quantity=int(one_item.get("quantity", "1")),
                    price_at_purchase=int(one_item.get("price", "0")),
                    is_tip=True if one_item.get("id") and int(one_item.get("id")) == -1 else False
                )

            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=line_items,
                mode="payment",
                success_url=f"{front_end_domain}success", # Angular Success Page
                cancel_url=front_end_domain, # Angular Cancel Page

                metadata={
                    "order_id": str(new_order.id)
                }
            )

            new_order.stripe_intent_id = checkout_session.id # Saves The Stripe Intent ID
            new_order.save() # Saves The Updated Order

            return JsonResponse({
                "success": True,
                "message": "Platba prebehla úspešne.",
                "url": checkout_session.url
            }, status=200)

        except Exception as e:
            print(e)
            return JsonResponse({
                "success": False, 
                "message": "Pri spracovávaní platby došlo k chybe."
            }, status=500)
            
    return JsonResponse({
        "success": False, 
        "message": "Platba sa dá uskutočniť len pomocou POST metódy."
    }, status=405)

@csrf_exempt
def stripeWebhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)

    except ValueError:
        return HttpResponse(status=400)

    except stripe.error.SignatureVerificationError:
        return HttpResponse(status=400)

    # Checkout
    if event["type"] == "checkout.session.completed":
        checkout_session = event["data"]["object"]

        metadata = checkout_session.metadata # Gets The Metadata
        order_id = metadata["order_id"] # Gets The Order ID

        try:
            order = Order.objects.get(id=order_id) # Gets The Order
            order.status = "PAID" # Updates The Order Status
            order.save() # Saves The Updated Order

        except Order.DoesNotExist:
            pass

    return HttpResponse(status=200)