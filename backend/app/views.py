from django.shortcuts import render
from django.http import JsonResponse
from .models import Dish
import stripe
import json
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
import os
import urllib.parse

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
            is_local = os.environ.get("IS_LOCAL", "True") == "True" # Gets The Information About Local Development
            front_end_domain = os.environ.get("FRONT_END_DOMAIN_URL", "http://localhost:4200/") # Gets The Front-End Domain URL

            data = json.loads(request.body) # Gets The Data
            items = data.get("items", []) # Gets The Items

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

                    "quantity": 1
                })

            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=line_items,
                mode="payment",
                success_url=f"{front_end_domain}success", # Angular Success Page
                cancel_url=front_end_domain # Angular Cancel Page
            )

            return JsonResponse({
                "success": True,
                "message": "Platba prebehla úspešne.",
                "url": checkout_session.url
            }, status=200)

        except Exception:
            return JsonResponse({
                "success": False, 
                "message": "Pri spracovávaní platby došlo k chybe."
            }, status=500)
            
    return JsonResponse({
        "success": False, 
        "message": "Platba sa dá uskutočniť len pomocou POST metódy."
    }, status=405)