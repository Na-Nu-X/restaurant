import { Component } from '@angular/core';
import { Cart } from "../services/cart"

@Component({
  selector: 'app-success',
  imports: [],
  templateUrl: './success.html',
  styleUrl: './success.scss',
})
export class Success {
  constructor(private cartService:Cart) { }

  // Method Which Executes In Beginning
  ngOnInit() {
    this.cartService.clearCart() // Clears The Whole Cart
  }
}