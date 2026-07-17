import { Component } from "@angular/core"
import { Dish } from "../services/dish"
import { CommonModule, CurrencyPipe } from "@angular/common"

import type { Meal } from "../services/dish"

export interface DailyMenuResponse {
  success:string,
  message:string,
  day_number:number,
  soup:string,
  meals:Meal[]
}

@Component({
  selector: "app-daily-menu",
  imports: [CurrencyPipe, CommonModule],
  templateUrl: "./daily-menu.html",
  styleUrl: "./daily-menu.scss",
})
export class DailyMenu {
  soup:string = "Načítavam..." // Stores The Daily Soup
  meals:Meal[] = [] // Stores The Daily Meals
  is_loading:boolean = true // Stores The Information If The Daily Menu Is Loading

  constructor(private DishService:Dish) { }

  // Method Which Executes In Beginning
  ngOnInit():void {
    this.getTodayMenu() // Gets Today's Menu
  }

  // Method For Get The Today's Menu
  getTodayMenu():void {
    // Gets The Today's Menu
    this.DishService.getTodayMenu().subscribe({
      next:(response) => {
        if(response && response.success) {
          this.soup = response.soup // Sets The Daily Soup
          this.meals = response.meals // Sets The Daily Meals
        } 
        
        else {
          console.error(response.message) // Shows The Error Message
        }

        this.is_loading = false // Ends The Loading
      },

      error:(error) => {
        console.error(error) // Shows The Error
        // alert("Pri načítaní dnešného menu došlo k chybe.") // Shows The Alert
        this.is_loading = false // Ends The Loading
      }
    })
  }
}