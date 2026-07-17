from django.db import models
import string
import random
from django.core.validators import MinValueValidator, MaxValueValidator

class Dish(models.Model):
    allergens = models.ManyToManyField(
        "Allergen", 
        verbose_name="Alergény", 
        help_text="Potravinové alergény.", 
        related_name="dishes", 
        blank=True
    )

    title = models.CharField(
        verbose_name="Názov", 
        help_text="Názov jedla.",
        max_length=20, 
        null=False
    )

    description = models.CharField(
        verbose_name="Popis", 
        help_text="Popis jedla.",
        max_length=200, 
        null=False
    )

    price = models.PositiveIntegerField(
        verbose_name="Cena", 
        help_text="Cena v centoch.",
        default=0, 
        null=False
    )

    image = models.CharField(
        verbose_name="Obrázok", 
        help_text="Obrázok jedla (názov súboru).",
        max_length=200, 
        null=False
    )

    class Meta:
        verbose_name = "Jedlo"
        verbose_name_plural = "Jedlá"

    def __str__(self):
        return self.title

class Allergen(models.Model):
    number = models.PositiveIntegerField(
        verbose_name="Číslo", 
        help_text="Číselné označenie alergénu.",
        unique=True,
        null=False
    )

    name = models.CharField(
        verbose_name="Názov", 
        help_text="Názov alebo označenie alergénu.",
        max_length=200, 
        null=False
    )

    class Meta:
        verbose_name = "Alergén"
        verbose_name_plural = "Alergény"
        ordering = ["number"]

    def __str__(self):
        return f"{self.number}. {self.name}"

# Function For Generate The Order Tracking Code
def generate_tracking_code():
    characters = string.ascii_uppercase + string.digits
    return "".join(random.choices(characters, k=6))

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
        verbose_name="Sledovací kód",
        help_text="Sledovací kód objednávky.",
        max_length=6, 
        unique=True, 
        blank=True,
        editable=False
    )

    first_name = models.CharField(
        verbose_name="Meno", 
        help_text="Meno zákazníka.",
        max_length=20, 
        null=False
    )

    last_name = models.CharField(
        verbose_name="Priezvisko", 
        help_text="Priezvisko zákazníka.",
        max_length=50, 
        null=False
    )

    address = models.CharField(
        verbose_name="Adresa", 
        help_text="Adresa doručenia.",
        max_length=100, 
        null=False
    )

    city = models.CharField(
        verbose_name="Mesto", 
        help_text="Mesto adresy doručenia.",
        max_length=50, 
        null=False
    )

    phone_number = models.CharField(
        verbose_name="Telefónne číslo", 
        help_text="Telefónne číslo zákazníka.",
        max_length=50, 
        null=False
    )

    message = models.TextField(
        verbose_name="Správa", 
        help_text="Dodatočná správa / poznámka.",
        max_length=100, 
        null=True, 
        blank=True
    )

    price = models.PositiveIntegerField(
        verbose_name="Cena", 
        help_text="Cena objednávky v centoch (bez prepitného).",
        default=0, 
        null=False
    )

    total_price = models.PositiveIntegerField(
        verbose_name="Celková cena", 
        help_text="Celková cena objednávky v centoch (vrátane prepitného).",
        default=0, 
        null=False
    )

    status = models.CharField(
        verbose_name="Stav objednávky", 
        help_text="Aktuálny stav objednávky.", 
        max_length=20, 
        choices=STATUS_CHOICES, 
        default="PENDING", 
        null=False
    )

    stripe_intent_id = models.CharField(
        verbose_name="Stripe ID", 
        help_text="ID transakcie v službe Stripe.",
        max_length=255, 
        unique=True, 
        null=True
    )

    cash_on_delivery = models.BooleanField(
        verbose_name="Na dobierku", 
        help_text="Informácia o tom, či vybraná objednávka bude vyplatená na dobierku alebo kartou.",
        default=False, 
        null=False
    )
    
    creation_time = models.DateTimeField(
        verbose_name="Čas vytvorenia",
        help_text="Čas vytvorenia objednávky.", 
        auto_now_add=True,
        null=False
    )

    class Meta:
        verbose_name = "Objednávka"
        verbose_name_plural = "Objednávky"

    def save(self, *args, **kwargs):
        if not self.tracking_code:
            new_tracking_code = generate_tracking_code()
            
            # Generates The Unique Tracking Code
            while Order.objects.filter(tracking_code=new_tracking_code).exists():
                new_tracking_code = generate_tracking_code()
                
            self.tracking_code = new_tracking_code

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Objednávka #{self.tracking_code} - {self.last_name} ({self.get_status_display()})"

class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, 
        verbose_name="Objednávka",
        help_text="Objednávka ktorej patrí daná položka.", 
        on_delete=models.CASCADE,
        related_name="items", 
        null=False
    )
    
    dish = models.ForeignKey(
        Dish, 
        verbose_name="Jedlo",
        help_text="Jedlo ktorému zodpovedá vybraná položka.", 
        on_delete=models.SET_NULL, 
        null=True,
        blank=True
    )

    quantity = models.PositiveIntegerField(
        verbose_name="Množstvo", 
        help_text="Množstvo položiek.",
        default=1, 
        null=False
    )
    
    price_at_purchase = models.PositiveIntegerField(
        verbose_name="Cena pri objednaní", 
        help_text="Cena za položku v centoch v čase vytvorenia objednávky (vrátane zľavy).",
        default=0, 
        null=False
    )

    is_tip = models.BooleanField(
        verbose_name="Je prepitné", 
        help_text="Informácia o tom, či vybraná položka je prepitné (inak je produkt).",
        default=False, 
        null=False
    )

    class Meta:
        verbose_name = "Položka objednávky"
        verbose_name_plural = "Položky objednávky"

    def __str__(self):
        dish_name = self.dish.title if self.dish else "Zmazané jedlo"
        return f"{self.quantity}x {dish_name} (Objednávka #{self.order.id})"

class Rating(models.Model):
    order = models.ForeignKey(
        Order, 
        verbose_name="Objednávka",
        help_text="Objednávka ktorej vybrané hodnotenie patrí.", 
        on_delete=models.CASCADE,
        related_name="ratings", 
        null=False
    )
    
    dish = models.ForeignKey(
        Dish, 
        verbose_name="Jedlo",
        help_text="Jedlo ktorému vybrané hodnotenie patrí.", 
        on_delete=models.CASCADE, 
        related_name="ratings",
        null=False
    )

    rating = models.PositiveIntegerField(
        verbose_name="Hodnotenie", 
        help_text="Hodnotenie od 1 do 5.", 
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
        verbose_name="Čas pridania",
        help_text="Čas pridania hodnotenia.", 
        auto_now_add=True,
        null=False
    )

    class Meta:
        verbose_name = "Hodnotenie jedla"
        verbose_name_plural = "Hodnotenie jedál"
        unique_together = ("dish", "order")

    def __str__(self):
        return f"{self.dish.name} - {self.stars} hviezdičiek" if self.stars > 1 else f"{self.dish.name} - {self.stars} hviezdička"

class ContactMessage(models.Model):
    first_name = models.CharField(
        verbose_name="Meno", 
        help_text="Meno zákazníka.",
        max_length=20, 
        null=False
    )

    last_name = models.CharField(
        verbose_name="Priezvisko", 
        help_text="Priezvisko zákazníka.",
        max_length=50, 
        null=False
    )

    email_address = models.CharField(
        verbose_name="E-mailová adresa", 
        help_text="E-mailová adresa zákazníka.",
        max_length=50,
        null=False
    )


    message = models.TextField(
        verbose_name="Správa", 
        help_text="Obsah správy.",
        max_length=250, 
        null=True, 
        blank=True
    )

    creation_time = models.DateTimeField(
        verbose_name="Čas odoslania",
        help_text="Čas odoslania správy.", 
        auto_now_add=True,
        null=False
    )

    class Meta:
        verbose_name = "Správa"
        verbose_name_plural = "Správy"

    def __str__(self):
        return f"Správa od {self.first_name} {self.last_name}"

class Coupon(models.Model):
    code = models.CharField(
        verbose_name="Kód",
        help_text="Kód kupónu.",
        max_length=50, 
        unique=True, 
        null=False
    )

    discount_percent = models.PositiveIntegerField(
        verbose_name="Zľava v percentách", 
        help_text="Zľava v percentách (1–100%).",
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        default=5, 
        null=False,
    )

    is_active = models.BooleanField(
        verbose_name="Je aktívny", 
        help_text="Informácia o tom, či vybraný kupón je stále dostupný.",
        default=True, 
        null=False
    )

    valid_until = models.DateTimeField(
        verbose_name="Platí do",
        help_text="Čas do kedy je vybraný kupón platný.", 
        null=True, 
        blank=True
    )

    creation_time = models.DateTimeField(
        verbose_name="Čas vytvorenia",
        help_text="Čas vytvorenia kupónu.", 
        auto_now_add=True,
        null=False
    )

    class Meta:
        verbose_name = "Kupón"
        verbose_name_plural = "Kupóny"

    def __str__(self):
        return f"{self.code} ({self.discount_percent}%)"

class DailySoup(models.Model):
    DAY_CHOICES = [
        (1, "Pondelok"),
        (2, "Utorok"),
        (3, "Streda"),
        (4, "Štvrtok"),
        (5, "Piatok"),
        (6, "Sobota"),
        (7, "Nedeľa")
    ]

    title = models.CharField(
        verbose_name="Názov", 
        help_text="Názov polievky (celý popis, gramáž, alergény).",
        max_length=250, 
        null=False
    )

    day_of_week = models.IntegerField(
        verbose_name="Deň v týždni", 
        help_text="Deň, ku ktorému patrí dená polievka.", 
        max_length=1, 
        choices=DAY_CHOICES, 
        default=1, 
        unique=True,
        null=False
    )

    is_active = models.BooleanField(
        verbose_name="Je aktívna", 
        help_text="Informácia o tom, či vybraná polievka je dostupná pre tento týždeň.",
        default=True, 
        null=False
    )

    class Meta:
        verbose_name = "Denné menu - Polievka"
        verbose_name_plural = "Denné menu - Polievky"

    def __str__(self):
        return f"{self.get_day_display()}: {self.name}"

class DailyMeal(models.Model):
    DAY_CHOICES = [
        (1, "Pondelok"),
        (2, "Utorok"),
        (3, "Streda"),
        (4, "Štvrtok"),
        (5, "Piatok"),
        (6, "Sobota"),
        (7, "Nedeľa"),
    ]

    number = models.PositiveIntegerField(
        verbose_name="Číslo", 
        help_text="Číslo jedla (v danom poradí sa zobrazí ponuka).",
        default=1, 
        null=False
    )

    title = models.CharField(
        verbose_name="Názov", 
        help_text="Názov jedla (celý popis, gramáž, alergény).",
        max_length=250, 
        null=False
    )

    price = models.PositiveIntegerField(
        verbose_name="Cena", 
        help_text="Cena v centoch.",
        default=0, 
        null=False
    )

    day_of_week = models.IntegerField(
        verbose_name="Deň v týždni", 
        help_text="Deň, ku ktorému patrí dené jedlo.", 
        max_length=1, 
        choices=DAY_CHOICES, 
        default=1, 
        null=False
    )

    is_active = models.BooleanField(
        verbose_name="Je aktívne", 
        help_text="Informácia o tom, či vybrané jedlo je dostupné pre tento týždeň.",
        default=True, 
        null=False
    )

    class Meta:
        verbose_name = "Denné menu - Hlavné jedlo"
        verbose_name_plural = "Denné menu - Hlavné jedlá"
        ordering = ["number"]

    def __str__(self):
        return f"{self.get_day_display()} - Menu {self.number}: {self.name}"

class RestaurantConfig(models.Model):
    is_force_closed = models.BooleanField(
        verbose_name="Je mimoriadne zatvorené", 
        help_text="Informácia o tom, či je prevádzka mimoriadne zatvorená (napr. sviatok).",
        default=False, 
        null=False
    )

    closure_reason = models.CharField(
        verbose_name="Dôvod zatvorenia", 
        help_text="Dôvod zatvorenia (zobrazené na stránke).",
        max_length=250, 
        blank=True, 
        null=True, 
    )

    class Meta:
        verbose_name = "Globálne nastavenie"
        verbose_name_plural = "Globálne nastavenia"

    def __str__(self):
        return f"Status: {'ZATVORENÉ' if self.is_force_closed else 'OTVORENÉ'}"

class OpeningHour(models.Model):
    DAY_CHOICES = [
        (1, "Pondelok"),
        (2, "Utorok"),
        (3, "Streda"),
        (4, "Štvrtok"),
        (5, "Piatok"),
        (6, "Sobota"),
        (7, "Nedeľa")
    ]

    day_of_week = models.IntegerField(
        verbose_name="Deň v týždni", 
        help_text="Deň v týždni.", 
        choices=DAY_CHOICES, 
        default=1, 
        unique=True,
        null=False
    )

    open_time = models.TimeField(
        verbose_name="Otvárame o",
        help_text="Čas otvárania.",
        null=False
    )

    close_time = models.TimeField(
        verbose_name="Zatvárame o",
        help_text="Čas zatvárania.",
        null=False
    )

    is_closed_all_day = models.BooleanField(
        verbose_name="Zatvorené celý deň", 
        help_text="Informácia o tom, či je prevádzka zatvorená celý deň.",
        default=False, 
        null=False
    )

    class Meta:
        verbose_name = "Otváracia hodina"
        verbose_name_plural = "Otváracie hodiny"
        ordering = ["day_of_week"]

    def __str__(self):
        if self.is_closed_all_day:
            return f"{self.get_day_display()}: Zatvorené"

        return f"{self.get_day_display()}: {self.open_time.strftime('%H:%M')} - {self.close_time.strftime('%H:%M')}"