import { 
  Component,
  OnInit
} from "@angular/core"

import { CommonModule } from "@angular/common"
import { Dish } from "../dish"
import { Cart } from "../cart"

import type { CartItem } from "../cart"

@Component({
  selector: "app-catalog",
  imports: [CommonModule],
  templateUrl: "./catalog.html",
  styleUrl: "./catalog.scss",
})

export class Catalog implements OnInit {
  dishes:CartItem[] = [] // Stores The Dishes Data

  constructor(private dishService:Dish, private cartService:Cart) { }

  // Method Which Executes In Beginning
  ngOnInit():void {
    this.dishService.getDishes().subscribe(data => {
      this.dishes = data // Sets The Dishes Data
    })
  }

  // Method For Add The Dish To The Cart
  addToCart(dish:CartItem) {
    this.cartService.addToCart(dish) // Stores The Dish
  }
}