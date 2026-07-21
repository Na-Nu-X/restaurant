from operator import is_
from django.http import JsonResponse
from .models import RestaurantConfig, OpeningHour, Dish, Order, OrderItem, Rating, ContactMessage, Coupon, DailySoup, DailyMeal
import stripe
import json
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
import os
import urllib.parse
from django.http import HttpResponse
from django.db.models import Avg, Count
from django.db.models.functions import Round
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

stripe.api_key = settings.STRIPE_SECRET_KEY

# def sendMail(user, subject, text_content, html_content, html_content_end, html_content_middle=""):
#     # Send Mail
#     subject = f"Wesiq - {subject}"
#     text_content = f"Ahoj {user.username}" + f",\n{text_content}"
#     sender = settings.EMAIL_HOST_USER
#     receiver = [user.email_address]
#     html_content = f"""
#         <h1>{f'Ahoj {user.username}'},</h1>
#         <p>{html_content}<p>
#         <h1>{html_content_middle}</h1>
#         <p>{html_content_end}<br>
#         Vaša reštaurácia.</p>
#     """

#     mail_message = EmailMultiAlternatives(subject, text_content, sender, receiver)
#     mail_message.attach_alternative(html_content, "text/html")
#     mail_message.send()

@csrf_exempt
def getStatus(request):
    config = RestaurantConfig.objects.first() # Gets The Global Config
    
    if config and config.is_force_closed:
        return JsonResponse({
            "success": True,
            "message": "Stav podniku bol úspešne získaný.",
            "is_open": False,
            "status": "Mimoriadne zatvorené",
            "reason": config.closure_reason or "Dôvod nebol uvedený."
        }, status=200)

    now = timezone.localtime(timezone.now()) # Gets The Current Time
    current_day_index = now.isoweekday() # Gets The Current Day Index
    current_time = now.time() # Gets The Current Time

    try:
        opening_hour = OpeningHour.objects.get(day_of_week=current_day_index) # Gets The Opening Hour For The Current Day

    except OpeningHour.DoesNotExist:
        return JsonResponse({
            "success": True,
            "message": "Stav podniku bol úspešne získaný.",
            "is_open": False,
            "status": "Zatvorené",
            "reason": "Neboli zadané otváracie hodiny."
        }, status=200)

    if opening_hour.is_closed_all_day:
        return JsonResponse({
            "success": True,
            "message": "Stav podniku bol úspešne získaný.",
            "is_open": False,
            "status": "Zatvorené",
            "reason": "Pravidelný zatvárací deň."
        })

    is_inside_opening_hours = opening_hour.open_time <= current_time <= opening_hour.close_time # Checks If The Current Time Is In Opening Hours

    if is_inside_opening_hours:
        return JsonResponse({
            "success": True,
            "message": "Stav podniku bol úspešne získaný.",
            "is_open": True,
            "status": "Otvorené",
            "reason": None,
            "open_till": opening_hour.close_time.strftime("%H:%M")
        })

    else:
        return JsonResponse({
            "success": True,
            "message": "Stav podniku bol úspešne získaný.",
            "is_open": False,
            "status": "Zatvorené",
            "reason": "Mimo otváracích hodín.",
            "next_open": opening_hour.open_time.strftime("%H:%M")
        })

def getTodayMenu(request):
    day = request.GET.get("day") # Gets The Day Number
    
    if day:
        try:
            day_number = int(day) # Gets The Day Number

        except ValueError:
            day_number = timezone.now().isoweekday() # Gets The Today's Day Number

    else:
        day_number = timezone.now().isoweekday() # Gets The Day Number

    soup = DailySoup.objects.filter(day_of_week=day_number, is_active=True).first() # Gets The Soup
    soup_data = soup.title if soup else "Polievka nebola zadaná." # Gets The Soup Data

    meals = DailyMeal.objects.filter(day_of_week=day_number, is_active=True) # Gets The Meal
    meals_data = [] # Stores The Meal Data
    
    for one_meal in meals:
        # Gets The Meals Data
        meals_data.append({
            "id": one_meal.id,
            "number": one_meal.number,
            "title": one_meal.title,
            "price": one_meal.price
        })

    return JsonResponse({
        "success": True,
        "message": "Dnešné menu bolo nájdené.",
        "day_number": day_number,
        "soup": soup_data,
        "meals": meals_data
    }, status=200)

def getDishes(request):
    # Gets All The Dishes
    dishes = Dish.objects.annotate(
        average_rating=Round(Avg("ratings__rating"), 1),
        rating_amount=Count("ratings")
    ).prefetch_related("allergens")

    # Creates Valid Format Of Dishes For JSON Response
    dishes_data = []

    for one_dish in dishes:
        dishes_data.append({
            "id": one_dish.id,
            "title": one_dish.title,
            "description": one_dish.description,
            "price": one_dish.price,
            "image": one_dish.image,
            "allergens": list(one_dish.allergens.values("number", "name")),
            "average_rating": one_dish.average_rating or 0.0,
            "rating_amount": one_dish.rating_amount
        })

    # Sends The Data As A JSON Response
    return JsonResponse({
        "success": True,
        "message": "Položky boli nájdené.",
        "dishes": list(dishes_data), 
    }, status=200, safe=False)

@csrf_exempt
def createCheckoutSession(request):
    if request.method == "POST":
        try:
            # Checks The Opening Hours

            status_response = getStatus(request) # Gets The Status Response
            status_data = json.loads(status_response.content.decode("utf-8")) # Gets The Status Data
            is_open = status_data.get("is_open", False) # Checks If The Restaurant Is Open

            if not is_open:
                return JsonResponse({
                    "success": False,
                    "message": "Objednávky nie je možné uskutočniť, keď je zatvorené."
                }, status=400)

            # Gets The Data

            is_local = os.environ.get("IS_LOCAL", "True") == "True" # Gets The Information About Local Development
            front_end_domain = os.environ.get("FRONT_END_DOMAIN_URL", "http://localhost:4200/") # Gets The Front-End Domain URL

            data = json.loads(request.body) # Gets The Data
            items = data.get("items", []) # Gets The Items
            customer = data.get("customer", []) # Gets The Customer
            coupon_code = data.get("coupon_code", None)  # Gets The Coupon Code

            # Calculates The Price

            discount_percent = 0 # Stores The Discount Percent

            if coupon_code:
                coupon = Coupon.objects.filter(code__iexact=coupon_code.strip(), is_active=True).first() # Gets The Active Coupon

                if coupon and (not coupon.valid_until or coupon.valid_until > timezone.now()):
                    discount_percent = coupon.discount_percent # Sets The Discount Percent

            raw_items_price = 0 # Stores The Price In Cents Without The Discount
            tip_amount = 0 # Stores The Tip Amount In Cents

            for one_item in items:
                item_id = one_item.get("id") # Gets The Item ID
                item_price = int(one_item.get("price", "0")) # Gets The Item Price
                item_quantity = int(one_item.get("quantity", "1")) # Gets The Item Quantity

                if item_id and int(item_id) == -1:
                    tip_amount += item_price * item_quantity # Saves The Tip Amount

                else:
                    raw_items_price += item_price * item_quantity # Calculates The Raw Items Price

            discount_amount = int(raw_items_price * (discount_percent / 100)) if discount_percent > 0 else 0 # Stores The Discount Amount
            discounted_items_price = raw_items_price - discount_amount # Stores The Discounted Items Price
            
            total_price = discounted_items_price + tip_amount # Gets The Total Price In Cents (Dishes After Discount + Tip)

            # Processes The Order

            # Saves The New Order
            new_order = Order.objects.create(
                first_name=customer.get("first_name", "Neznáme"),
                last_name=customer.get("last_name", "Neznáme"),
                address=customer.get("address", "Neznáma"),
                city=customer.get("city", "Neznáme"),
                phone_number=customer.get("phone_number", "Neznáme"),
                message=customer.get("message", None),
                price=discounted_items_price,
                total_price=total_price,
                status="PENDING"
            )

            line_items = [] # Stores All Items

            discount_multiplier = (100 - discount_percent) / 100 if discount_percent > 0 else 1.0 # Gets The Discount Multiplayer (10% = 0.9)

            for one_item in items:
                image_name = one_item.get("image") # Gets THe Image Name
                item_id = one_item.get("id") # Gets The Item ID
                original_unit_price = int(one_item.get("price", "0")) # Gets The Original Price

                if is_local:
                    title = one_item.get("title", "food") # Gets The Title
                    safe_title = urllib.parse.quote(title) # Creates The Clear Title
                    image_url = f"https://dummyimage.com/600x400/ff7f00/fff?text={safe_title}" # Generates Random Image
                    
                else:
                    domain = os.environ.get("DOMAIN_URL", "localhost") # Gets The Domain
                    image_url = f"https://{domain}/static/images/{image_name}" # Gets The Image URL

                if item_id and int(item_id) == -1:
                    final_unit_price = original_unit_price # Doesn't Apply The Discount On The Tip

                else:
                    final_unit_price = int(round(original_unit_price * discount_multiplier)) # Applies The Discount On The Dish

                line_items.append({
                    "price_data": {
                        "currency": "eur",
                        "product_data": {
                            "name": one_item.get("title"),
                            "images": [image_url],
                        },

                        "unit_amount": final_unit_price,
                    },

                    "quantity": int(one_item.get("quantity", "1"))
                })

                # Saves The New Order
                OrderItem.objects.create(
                    order=new_order,
                    dish_id=int(item_id) if item_id and int(item_id) != -1 else None,
                    quantity=int(one_item.get("quantity", "1")),
                    price_at_purchase=final_unit_price,
                    is_tip=True if item_id and int(item_id) == -1 else False
                )

            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=line_items,
                mode="payment",
                success_url=f"{front_end_domain}success?code={new_order.tracking_code}",
                cancel_url=front_end_domain,
                
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

        except Exception:
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

@csrf_exempt
def createOrder(request):
    if request.method == "POST":
        try:
            # Checks The Opening Hours

            status_response = getStatus(request) # Gets The Status Response
            status_data = json.loads(status_response.content.decode("utf-8")) # Gets The Status Data
            is_open = status_data.get("is_open", False) # Checks If The Restaurant Is Open

            if not is_open:
                return JsonResponse({
                    "success": False,
                    "message": "Objednávky nie je možné uskutočniť, keď je zatvorené."
                }, status=400)
                
            # Gets The Data

            front_end_domain = os.environ.get("FRONT_END_DOMAIN_URL", "http://localhost:4200/") # Gets The Front-End Domain URL

            data = json.loads(request.body) # Gets The Data
            items = data.get("items", []) # Gets The Items
            customer = data.get("customer", {}) # Gets The Customer
            coupon_code = data.get("coupon_code", None) # Gets The Coupon Code

            # Calculates The Price

            discount_percent = 0 # Stores The Discount Percent

            if coupon_code:
                coupon = Coupon.objects.filter(code__iexact=coupon_code.strip(), is_active=True).first() # Gets The Active Coupon

                if coupon and (not coupon.valid_until or coupon.valid_until > timezone.now()):
                    discount_percent = coupon.discount_percent # Sets The Discount Percent

            raw_items_price = 0 # Stores The Price In Cents Without The Discount

            for one_item in items:
                item_id = one_item.get("id") # Gets The Item ID

                if item_id and int(item_id) != -1:
                    raw_items_price += int(one_item.get("price", "0")) * int(one_item.get("quantity", "1")) # Calculates The Raw Items Price

            discount_multiplier = (100 - discount_percent) / 100 if discount_percent > 0 else 1.0 # Gets The Discount Multiplayer (10% = 0.9)
            discount_amount = int(raw_items_price * (discount_percent / 100)) if discount_percent > 0 else 0 # Gets The Discount Amount
            discounted_items_price = raw_items_price - discount_amount # Stores The Discounted Items Price

            # Processes The Order

            # Saves The New Order
            new_order = Order.objects.create(
                first_name=customer.get("first_name", "Neznáme"),
                last_name=customer.get("last_name", "Neznáme"),
                address=customer.get("address", "Neznáma"),
                city=customer.get("city", "Neznáme"),
                phone_number=customer.get("phone_number", "Neznáme"),
                message=customer.get("message", None),
                price=discounted_items_price,
                total_price=discounted_items_price,
                status="PREPARING",
                cash_on_delivery=True
            )

            for one_item in items:
                item_id = one_item.get("id") # Gets The Item ID
                original_unit_price = int(one_item.get("price", "0")) # Gets The Original Price
                
                if item_id and int(item_id) == -1:
                    final_unit_price = original_unit_price # Doesn't Apply The Discount On The Tip

                else:
                    final_unit_price = int(round(original_unit_price * discount_multiplier)) # Applies The Discount On The Dish

                # Saves The New Order
                OrderItem.objects.create(
                    order=new_order,
                    dish_id=int(item_id) if item_id and int(item_id) != -1 else None,
                    quantity=int(one_item.get("quantity", "1")),
                    price_at_purchase=final_unit_price,
                    is_tip=True if item_id and int(item_id) == -1 else False
                )

            return JsonResponse({
                "success": True,
                "message": "Objednávka bola prijatá.",
                "tracking_code": new_order.tracking_code,
                "url": f"{front_end_domain}success-order?code={new_order.tracking_code}"
            }, status=200)

        except Exception:
            return JsonResponse({
                "success": False, 
                "message": "Pri spracovávaní objednávky došlo k chybe."
            }, status=500)
            
    return JsonResponse({
        "success": False, 
        "message": "Objednávka sa dá uskutočniť len pomocou POST metódy."
    }, status=405)

@csrf_exempt
def getOrderStatus(request, tracking_code):
    try:
        order = Order.objects.get(tracking_code=tracking_code.upper()) # Gets The Order

        # Creates Valid Format Of Order Details For JSON Response
        order_details = {
            "id": order.id,
            "tracking_code": order.tracking_code,
            "first_name": order.first_name,
            "last_name": order.last_name,
            "address": order.address,
            "city": order.city,
            "phone_number": order.phone_number,
            "total_price": order.total_price,
            "status": order.status,
            "cash_on_delivery": order.cash_on_delivery,
            "creation_time": order.creation_time.isoformat()
        }
        
        return JsonResponse({
            "success": True, 
            "message": "Objednávka bola nájdená.",
            "order_details": order_details
        }, status=200)
        
    except Order.DoesNotExist:
        return JsonResponse({
            "success": False, 
            "message": "Objednávku sa nepodarilo nájsť."
        }, status=404)

@csrf_exempt
def getOrderedItems(request, id):
    items = OrderItem.objects.filter(order_id=id)

    # Creates Valid Format Of Ordered Items For JSON Response
    ordered_items = [
        {
            "id": one_item.dish.id,
            "title": one_item.dish.title,
            "description": one_item.dish.description,
            "price": one_item.price_at_purchase,
            "quantity": one_item.quantity,
            "image": one_item.dish.image
        }

        for one_item in items
        if one_item.dish and not one_item.is_tip
    ]
    
    return JsonResponse({
        "success": True, 
        "message": "Položky boli nájdené.",
        "ordered_items": ordered_items
    }, status=200)

@csrf_exempt
def sendRating(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body) # Gets The Data
            tracking_code = data.get("tracking_code") # Gets The Tracking Code
            all_ratings = data.get("all_ratings", []) # Gets All Ratings

            order = Order.objects.get(tracking_code=tracking_code.upper(), status="COMPLETED") # Gets The Order

            for one_item in all_ratings:
                dish_id = one_item.get("dish_id") # Gets The Dish ID
                rating = one_item.get("rating") # Gets The Rating

                # Creates Or Updates The Rating
                Rating.objects.update_or_create(
                    order=order,
                    dish_id=dish_id,
                    defaults={"rating": rating}
                )

            return JsonResponse({
                "success": True, 
                "message": "Hodnotenia boli úspešne odoslané."
            }, status=200)

        except Order.DoesNotExist:
            return JsonResponse({
                "success": False, 
                "message": "Objednávka neexistuje alebo ešte nebola doručená."
            }, status=404)

        except Exception:
            return JsonResponse({
                "success": False, 
                "message": "Pri pridávaní hodnotenia došlo k chybe."
            }, status=500)
            
    return JsonResponse({
        "success": False, 
        "message": "Hodnotenie sa dá pridať len pomocou POST metódy."
    }, status=405)

@csrf_exempt
def sendMessage(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body) # Gets The Data

            first_name = data.get("first_name") # Gets The First Name
            last_name = data.get("last_name") # Gets The Last Name
            email_address = data.get("email_address") # Gets The E-mail Address
            message = data.get("message") # Gets The Message
            
            # Saves The New Message
            ContactMessage.objects.create(
                first_name=first_name,
                last_name=last_name,
                email_address=email_address,
                message=message
            )

            # Sends Mail
            subject = f"Reštaurácia - správa od zákazníka"
            text_content = f"{first_name} {last_name} - {email_address}\n\n{message}"
            sender = email_address
            receiver = [settings.EMAIL_HOST_USER]
            html_content = f"""
                <p>
                    <b>{first_name} {last_name} - {email_address}</b><br><br>
                    {message}
                </p>
            """

            mail_message = EmailMultiAlternatives(subject, text_content, sender, receiver)
            mail_message.attach_alternative(html_content, "text/html")

            mail_message.send()
            
            return JsonResponse({
                "success": True, 
                "message": "Správa bola odoslaná."
            }, status=200)

        except Exception as e:
            print(e)
            return JsonResponse({
                "success": False, 
                "message": "Pri odosielaní správy došlo k chybe."
            }, status=500)
            
    return JsonResponse({
        "success": False, 
        "message": "Správa sa dá odoslať len pomocou POST metódy."
    }, status=405)

@csrf_exempt
def validateCoupon(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body) # Gets The Data
            code = data.get("code", "").strip().upper() # Gets The Code

            coupon = Coupon.objects.get(code__iexact=code, is_active=True) # Gets The Active Coupon

            if coupon.valid_until and coupon.valid_until < timezone.now():
                return JsonResponse({
                    "success": False,
                    "message": "Platnosť zadaného kupónu už vypršala."
                }, status=400)

            return JsonResponse({
                "success": True,
                "message": "Kupón bol úspešne uplatnený!",
                "code": coupon.code,
                "discount_percent": coupon.discount_percent
            }, status=200)

        except Coupon.DoesNotExist:
            return JsonResponse({
                "success": False,
                "message": "Kupón nie je platný."
            }, status=404)

    return JsonResponse({
        "success": False, 
        "message": "Kupón sa dá uplatniť len pomocou POST metódy."
    }, status=405)