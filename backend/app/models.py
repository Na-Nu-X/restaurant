from django.db import models
import string
import random
from django.core.validators import MinValueValidator, MaxValueValidator

class Dish(models.Model):
    allergens = models.ManyToManyField(
        "Allergen", 
        verbose_name="Allergens", 
        help_text="Food allergens.", 
        related_name="dishes", 
        blank=True
    )

    title = models.CharField(
        verbose_name="Title", 
        help_text="Title of the dish.",
        max_length=20, 
        null=False
    )

    description = models.CharField(
        verbose_name="Description", 
        help_text="Description of the dish.",
        max_length=200, 
        null=False
    )

    price = models.PositiveIntegerField(
        verbose_name="Price", 
        help_text="Price in cents.",
        default=0, 
        null=False
    )

    image = models.CharField(
        verbose_name="Image", 
        help_text="Image of the dish.",
        max_length=200, 
        null=False
    )

    def __str__(self):
        return self.title

class Allergen(models.Model):
    number = models.PositiveIntegerField(
        verbose_name="Number", 
        help_text="Numerical designation of the allergen.",
        unique=True,
        null=False
    )

    name = models.CharField(
        verbose_name="Name", 
        help_text="Name or title of the allergen.",
        max_length=200, 
        null=False
    )

    class Meta:
        ordering = ["number"]

    def __str__(self):
        return f"{self.number}. {self.name}"

# Function For Generate The Order Tracking Code
def generate_tracking_code():
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choices(characters, k=6))

class Order(models.Model):
    STATUS_CHOICES = (
        ("PENDING", "Čaká na platbu"),
        ("PAID", "Zaplatená"),
        ("PREPARING", "Pripravuje sa"),
        ("DELIVERING", "Na ceste"),
        ("COMPLETED", "Doručená"),
        ("CANCELLED", "Zrušená")
    )

    tracking_code = models.CharField(
        verbose_name="Tracking Code",
        help_text="Order's tracking code.",
        max_length=6, 
        unique=True, 
        blank=True,
        editable=False
    )

    first_name = models.CharField(
        verbose_name="First Name", 
        help_text="Customer's first name.",
        max_length=20, 
        null=False
    )

    last_name = models.CharField(
        verbose_name="Last Name", 
        help_text="Customer's last name.",
        max_length=50, 
        null=False
    )

    address = models.CharField(
        verbose_name="Address", 
        help_text="Customer's address.",
        max_length=100, 
        null=False
    )

    city = models.CharField(
        verbose_name="City", 
        help_text="Customer's city.",
        max_length=50, 
        null=False
    )

    phone_number = models.CharField(
        verbose_name="Phone Number", 
        help_text="Customer's phone number.",
        max_length=50, 
        null=False
    )

    message = models.TextField(
        verbose_name="Message", 
        help_text="Additional message or note.",
        max_length=100, 
        null=True, 
        blank=True
    )

    price = models.PositiveIntegerField(
        verbose_name="Price", 
        help_text="Price of the order in cents (without the tip).",
        default=0, 
        null=False
    )

    total_price = models.PositiveIntegerField(
        verbose_name="Total Price", 
        help_text="Total price of the order in cents (with the tip).",
        default=0, 
        null=False
    )

    status = models.CharField(
        verbose_name="Order Status", 
        help_text="Order's status.", 
        max_length=20, 
        choices=STATUS_CHOICES, 
        default="PENDING", 
        null=False
    )

    stripe_intent_id = models.CharField(
        verbose_name="Stripe ID", 
        help_text="Transaction ID in the Stripe service.",
        max_length=255, 
        unique=True, 
        null=True
    )

    cash_on_delivery = models.BooleanField(
        verbose_name="Cash On Delivery", 
        help_text="Stores information on whether the order will be paid for via cash on delivery.",
        default=False, 
        null=False
    )
    
    creation_time = models.DateTimeField(
        verbose_name="Creation Time",
        help_text="Time of the order submission.", 
        auto_now_add=True,
        null=False
    )

    def save(self, *args, **kwargs):
        if not self.tracking_code:
            new_tracking_code = generate_tracking_code()
            
            # Generates The Unique Tracking Code
            while Order.objects.filter(tracking_code=new_tracking_code).exists():
                new_tracking_code = generate_tracking_code()
                
            self.tracking_code = new_tracking_code

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order #{self.tracking_code} - {self.last_name} ({self.get_status_display()})"

class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, 
        verbose_name="Order",
        help_text="The order to which the item belongs.", 
        on_delete=models.CASCADE,
        related_name="items", 
        null=False
    )
    
    dish = models.ForeignKey(
        Dish, 
        verbose_name="Dish",
        help_text="The dish to which the item belongs.", 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True
    )

    quantity = models.PositiveIntegerField(
        verbose_name="Quantity", 
        help_text="Quantity of items.",
        default=1, 
        null=False
    )
    
    price_at_purchase = models.PositiveIntegerField(
        verbose_name="Price At Purchase", 
        help_text="Price per item in cents at the time the order was created.",
        default=0, 
        null=False
    )

    is_tip = models.BooleanField(
        verbose_name="Is Tip", 
        help_text="Stores the information if the item is tip.",
        default=False, 
        null=False
    )

    def __str__(self):
        dish_name = self.dish.title if self.dish else "Zmazané jedlo"
        return f"{self.quantity}x {dish_name} (Order #{self.order.id})"

class Rating(models.Model):
    order = models.ForeignKey(
        Order, 
        verbose_name="Order",
        help_text="The order to which the rating belongs.", 
        on_delete=models.CASCADE,
        related_name="ratings", 
        null=False
    )
    
    dish = models.ForeignKey(
        Dish, 
        verbose_name="Dish",
        help_text="The dish to which the rating belongs.", 
        on_delete=models.CASCADE, 
        related_name="ratings",
        null=False
    )

    rating = models.PositiveIntegerField(
        verbose_name="Rating", 
        help_text="Rating from 1 to 5.", 
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        default=1, 
        null=False
    )

    # comment = models.TextField(
    #     verbose_name="Comment", 
    #     help_text="Comment content.", 
    #     max_length=100, 
    #     null=True,
    #     blank=True
    # )

    creation_time = models.DateTimeField(
        verbose_name="Creation Time",
        help_text="Time of the rating submission.", 
        auto_now_add=True,
        null=False
    )

    class Meta:
        unique_together = ("dish", "order")

    def __str__(self):
        return f"{self.dish.name} - {self.stars} stars" if self.stars > 1 else f"{self.dish.name} - {self.stars} star"

class ContactMessage(models.Model):
    first_name = models.CharField(
        verbose_name="First Name", 
        help_text="Customer's first name.",
        max_length=20, 
        null=False
    )

    last_name = models.CharField(
        verbose_name="Last Name", 
        help_text="Customer's last name.",
        max_length=50, 
        null=False
    )

    email_address = models.CharField(
        verbose_name="E-mail Address", 
        help_text="Customer's e-mail address.",
        max_length=50,
        null=False
    )


    message = models.TextField(
        verbose_name="Message", 
        help_text="Message content.",
        max_length=250, 
        null=True, 
        blank=True
    )

    creation_time = models.DateTimeField(
        verbose_name="Creation Time",
        help_text="Time of the message submission.", 
        auto_now_add=True,
        null=False
    )

    def __str__(self):
        return f"Správa od {self.first_name} {self.last_name}"