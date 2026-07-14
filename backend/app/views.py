from django.shortcuts import render
from django.http import JsonResponse
from .models import Dish

def getDishes(request):
    dishes = Dish.objects.all().values() # Gets All The Dishes

    # Sends The Data As A JSON Response
    return JsonResponse(
        list(dishes), 
        safe=False
    )