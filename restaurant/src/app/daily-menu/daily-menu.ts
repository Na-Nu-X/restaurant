import { Component, OnInit, inject, signal } from "@angular/core"

import { BRAND } from "../config/brand.config"
import { Dish } from "../services/dish"
import { PricePipe } from "../shared/price.pipe"
import { SECTIONS } from "../shared/section-scroll"

import type { Meal } from "../services/dish"

export interface DailyMenuResponse {
  success:string,
  message:string,
  day_number:number,
  soup:string,
  meals:Meal[]
}

type LoadState = "loading" | "ready" | "error"

// Formats Today's Date For The Section Header (e.g. "Štvrtok, 12. novembra")
function formatToday():string {
  const text:string = new Intl.DateTimeFormat(BRAND.locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date())
  return text.charAt(0).toUpperCase() + text.slice(1)
}

@Component({
  selector: "app-daily-menu",
  imports: [PricePipe],
  templateUrl: "./daily-menu.html",
  styleUrl: "./daily-menu.scss",
})
export class DailyMenu implements OnInit {
  private dishService:Dish = inject(Dish)

  readonly section_id = SECTIONS.dailyMenu
  readonly today:string = formatToday()

  readonly state = signal<LoadState>("loading") // Stores The Loading State Of The Daily Menu
  readonly soup = signal<string>("") // Stores The Daily Soup
  readonly meals = signal<Meal[]>([]) // Stores The Daily Meals

  // Method Which Executes In Beginning
  ngOnInit():void {
    this.dishService.getTodayMenu().subscribe({
      next:(response) => {
        if(response && response.success) {
          this.soup.set(response.soup) // Sets The Daily Soup
          this.meals.set([...response.meals].sort((a, b) => a.number - b.number)) // Sets The Daily Meals
          this.state.set("ready")
        }

        else {
          console.error(response.message) // Shows The Error Message
          this.state.set("error")
        }
      },

      error:(error) => {
        console.error(error) // Shows The Error
        this.state.set("error")
      }
    })
  }
}
