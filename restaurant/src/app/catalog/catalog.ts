import { 
  ChangeDetectorRef,
  Component,
  OnInit
} from "@angular/core"

import { CommonModule } from "@angular/common"
import { Dish } from "../services/dish"
import { Cart } from "../services/cart"

import type { CartItem } from "../services/cart"

@Component({
  selector: "app-catalog",
  imports: [CommonModule],
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
    this.dishService.getDishes().subscribe(data => {
      this.dishes = data // Sets The Dishes Data
      this.filtered_dishes = data // Sets The Filtered Dishes Data
      this.listenToSearch() // Initializes The Listen To Search
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

  // Method For Add The Dish To The Cart
  addToCart(dish:CartItem) {
    this.cartService.addToCart(dish) // Stores The Dish
  }
}