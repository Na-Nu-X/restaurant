from django.db import models

class Dish(models.Model):
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