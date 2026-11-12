import { Component, OnInit, computed, inject, signal } from "@angular/core"

import { Cart } from "../services/cart"
import { Dish } from "../services/dish"
import { Filters } from "../filters/filters"
import { SearchBar } from "../search-bar/search-bar"
import { DishCard } from "../dish-card/dish-card"
import { DishDetail, DishSelection } from "../dish-detail/dish-detail"
import { Toast } from "../shared/toast/toast.service"

import type { CartItem, ModifierItem } from "../services/cart"
import type { FilterGroup } from "../services/dish"

type LoadState = "loading" | "ready" | "error"

// Lower-Case Text Without Diacritics, So "kuraci" Finds "Kurací"
function normalize(text:string):string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

// Slovak Plural Of "Jedlo" (1 Jedlo, 2–4 Jedlá, 0 / 5+ Jedál)
export function dishCountLabel(count:number):string {
  if(count === 1) return "1 jedlo"
  if(count >= 2 && count <= 4) return `${count} jedlá`
  return `${count} jedál`
}

// Menu Section: Search, Category Chips, Dish Grid And The Dish Detail Panel
@Component({
  selector: "app-catalog",
  imports: [Filters, SearchBar, DishCard, DishDetail],
  templateUrl: "./catalog.html",
  styleUrl: "./catalog.scss",
})
export class Catalog implements OnInit {
  private dishService:Dish = inject(Dish)
  private cartService:Cart = inject(Cart)
  private toast:Toast = inject(Toast)
  private added_timer?:ReturnType<typeof setTimeout>

  readonly state = signal<LoadState>("loading")
  readonly dishes = signal<CartItem[]>([]) // All Dishes From The Back-End
  readonly groups = signal<FilterGroup[]>([]) // Filter Groups With Their Categories

  readonly query = signal<string>("") // Search Text
  readonly category = signal<number|null>(null) // Selected Category (null = Everything)

  readonly selected_dish = signal<CartItem|null>(null) // Dish Shown In The Detail Panel
  readonly just_added_id = signal<number|null>(null) // Card Whose "+" Shows A Check Mark

  readonly skeletons:number[] = [1, 2, 3, 4, 5, 6]

  // Dishes Matching Both The Search Text And The Selected Category
  readonly filtered = computed<CartItem[]>(() => {
    const query:string = normalize(this.query())
    const category:number|null = this.category()

    return this.dishes().filter(dish =>
      (category === null || dish.category_id === category) &&
      (!query || normalize(`${dish.title} ${dish.description}`).includes(query))
    )
  })

  readonly has_active_filters = computed<boolean>(() => this.query().trim() !== "" || this.category() !== null)
  readonly result_label = computed<string>(() => dishCountLabel(this.filtered().length))

  // Method Which Executes In Beginning
  ngOnInit():void {
    this.loadCategories()
    this.loadDishes()
  }

  // Method For Load The Filter Groups (The Menu Works Without Them)
  private loadCategories():void {
    this.dishService.getCategories().subscribe({
      next:(response) => {
        if(response?.success) this.groups.set(response.filter_groups)
        else console.error(response.message)
      },

      error:(error) => console.error(error)
    })
  }

  // Method For Load The Dishes
  loadDishes():void {
    this.state.set("loading")

    this.dishService.getDishes().subscribe({
      next:(response) => {
        if(response?.success) {
          this.dishes.set(response.dishes)
          this.state.set("ready")
        }

        else {
          console.error(response.message)
          this.state.set("error")
        }
      },

      error:(error) => {
        console.error(error)
        this.state.set("error")
      }
    })
  }

  // Method For Reset The Search And The Category
  resetFilters():void {
    this.query.set("")
    this.category.set(null)
  }

  // Method For Open The Dish Detail Panel
  open(dish:CartItem):void {
    this.selected_dish.set(dish)
  }

  // Method For Close The Dish Detail Panel
  closeDetail():void {
    this.selected_dish.set(null)
  }

  // "+" On A Card: Dishes With Options Open The Panel, Others Go Straight To The Cart
  quickAdd(dish:CartItem):void {
    if((dish.modifier_groups?.length ?? 0) > 0) {
      this.open(dish)
      return
    }

    this.addToCart(dish, [], 1)
  }

  // Confirmed In The Detail Panel
  onConfirm(selection:DishSelection):void {
    this.addToCart(selection.dish, selection.modifiers, selection.quantity)
    this.closeDetail()
  }

  // Method For Add To Cart With Visual Feedback
  private addToCart(dish:CartItem, modifiers:ModifierItem[], quantity:number):void {
    this.cartService.addToCart(dish, modifiers, quantity)

    // Shows A Check Mark On The Card For A Moment
    clearTimeout(this.added_timer)
    this.just_added_id.set(dish.id)
    this.added_timer = setTimeout(() => this.just_added_id.set(null), 1400)

    this.toast.success(`${quantity > 1 ? quantity + "× " : ""}${dish.title} je v košíku`, {
      label: "Zobraziť košík",
      run: () => this.cartService.openCart()
    })
  }
}
