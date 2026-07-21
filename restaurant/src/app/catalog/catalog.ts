import { 
  ChangeDetectorRef,
  Component,
  OnInit
} from "@angular/core"

import { CommonModule, CurrencyPipe } from "@angular/common"
import { Dish } from "../services/dish"
import { Cart } from "../services/cart"

import type { CartItem } from "../services/cart"
import type { modifierGroup } from "../services/cart"

@Component({
  selector: "app-catalog",
  imports: [CommonModule, CurrencyPipe],
  templateUrl: "./catalog.html",
  styleUrl: "./catalog.scss",
})

export class Catalog implements OnInit {
  dishes:CartItem[] = [] // Stores The Dishes Data
  filtered_dishes:CartItem[] = [] // Stores The Filtered Dishes Data

  constructor(
    private dishService:Dish, 
    private cartService:Cart,
    private cdr:ChangeDetectorRef
  ) { }

  // Method Which Executes In Beginning
  ngOnInit():void {
    this.dishService.getDishes().subscribe({
      next:(response) => {
        if(response && response.success) {
          this.dishes = response.dishes // Sets The Dishes Data
          this.filtered_dishes = response.dishes // Sets The Filtered Dishes Data
          this.listenToSearch() // Initializes The Listen To Search
        }
        
        else {
          console.error(response.message) // Shows The Error Message
        }
      },

      error:(error) => {
        console.error(error) // Shows The Error
        alert("Pri načítaní položiek došlo k chybe.") // Shows The Alert
      }
    })
  }

  // Method For Listen To Search
  private listenToSearch():void {
    this.dishService.searched_text$.subscribe(text => {
      const searched_text:string = text.toLowerCase().trim() // Gets The Clear Search Text
    
      if(!searched_text) this.filtered_dishes = this.dishes // Shows Everything If The Search is Empty
      else this.filtered_dishes = this.dishes.filter(dish => dish.title.toLowerCase().includes(searched_text)) // Filters The Dishes

      this.cdr.detectChanges() // Rerenders The HTML
    })
  }

  // Method For Select The Modifier With A Radio Button
  SelectModifierRadio(
    dish:CartItem, 
    group:modifierGroup, 

    item:{
      id:number,
      title:string,
      extra_price:number
    }
  ) {
    if(!dish.selected_modifiers) dish.selected_modifiers = {}
    dish.selected_modifiers[group.id] = [item]
  }

  // Method For Toggle The Modifier With A Checkbox Button
  ToggleModifierCheckbox(
    dish:CartItem, 
    group:modifierGroup, 

    item:{
      id:number,
      title:string,
      extra_price:number
    }, 
    
    event:Event
  ) {
    const is_checked:boolean = (event.target as HTMLInputElement).checked

    if(!dish.selected_modifiers) dish.selected_modifiers = {}
    if(!dish.selected_modifiers[group.id]) dish.selected_modifiers[group.id] = []
    if(is_checked) dish.selected_modifiers[group.id].push(item)
    else dish.selected_modifiers[group.id] = dish.selected_modifiers[group.id].filter(item => item.id !== item.id)
  }

  // Method For Add The Dish To The Cart
  addToCart(dish:CartItem) {
    this.cartService.addToCart(dish) // Stores The Dish
  }

  // Method For Get Allergens Tooltip Content
  getAllergensTooltip(
    allergens: { 
      number:number,
      name: string 
    }[]
  ):string {
    if(allergens.length === 0) return "" // Returns The Empty Tooltip Content
    return allergens.map(a => `${a.number}. ${a.name}`).join('\n\n') // Returns The Tooltip Content
  }
}