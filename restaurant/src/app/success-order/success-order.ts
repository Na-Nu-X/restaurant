import { Component } from "@angular/core"
import { Cart } from "../services/cart"

@Component({
  selector: 'app-success-order',
  imports: [],
  templateUrl: './success-order.html',
  styleUrl: '../success/success.scss',
})
export class SuccessOrder {
  constructor(private cartService:Cart) { }

  // Method Which Executes In Beginning
  ngOnInit() {
    this.cartService.clearCart() // Clears The Whole Cart
  }
}