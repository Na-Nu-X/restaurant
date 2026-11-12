import { Component, input, model } from "@angular/core"
import type { Category, FilterGroup } from "../services/dish"

const DEFAULT_ICON:string = "fa-solid fa-list" // Back-End Default, Not Shown Because It Would Be The Same On Every Chip

// Category Filter Chips. One Category Can Be Active At A Time (Each Dish Belongs To One Category)
@Component({
  selector: "app-filters",
  templateUrl: "./filters.html",
  styleUrl: "./filters.scss",
})
export class Filters {
  readonly groups = input<FilterGroup[]>([]) // Filter Groups With Their Categories
  readonly selected = model<number|null>(null) // Selected Category ID (null = Everything)

  // Method For Select The Category (Clicking The Active Chip Again Shows Everything)
  select(category_id:number|null):void {
    this.selected.set(this.selected() === category_id ? null : category_id)
  }

  // Method For Get The Custom Icon Of A Category (Hides The Default One)
  icon(category:Category):string|null {
    return category.icon && category.icon !== DEFAULT_ICON ? category.icon : null
  }

  // Method For Format The Category Name (The Back-End Stores Them Lower-Case)
  label(category:Category):string {
    return category.name.charAt(0).toUpperCase() + category.name.slice(1)
  }
}
