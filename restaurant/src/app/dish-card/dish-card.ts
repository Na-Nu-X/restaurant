import { Component, computed, input, output } from "@angular/core"
import { DecimalPipe } from "@angular/common"

import { BRAND } from "../config/brand.config"
import { PricePipe } from "../shared/price.pipe"
import type { CartItem } from "../services/cart"

// Menu Card Of One Dish. Clicking The Card Opens The Detail; The "+" Button Adds To The Cart
@Component({
  selector: "app-dish-card",
  imports: [PricePipe, DecimalPipe],
  templateUrl: "./dish-card.html",
  styleUrl: "./dish-card.scss",
})
export class DishCard {
  readonly dish = input.required<CartItem>()
  readonly just_added = input<boolean>(false) // Shows A Check Mark On The "+" Button For A Moment

  readonly opened = output<CartItem>() // Card Clicked → Show The Detail Panel
  readonly quick_added = output<CartItem>() // "+" Clicked

  readonly locale:string = BRAND.locale

  readonly has_options = computed<boolean>(() => (this.dish().modifier_groups?.length ?? 0) > 0)
  readonly has_rating = computed<boolean>(() => (this.dish().rating_amount ?? 0) > 0)
  readonly allergen_numbers = computed<string>(() => this.dish().allergens.map(allergen => allergen.number).join(", "))

  // Label Of The "+" Button For Screen Readers
  readonly add_label = computed<string>(() => this.has_options()
    ? `Vybrať možnosti: ${this.dish().title}`
    : `Pridať do košíka: ${this.dish().title}`)

  // Method For Quick Add Without Opening The Card
  onAdd(event:Event):void {
    event.stopPropagation()
    this.quick_added.emit(this.dish())
  }
}
