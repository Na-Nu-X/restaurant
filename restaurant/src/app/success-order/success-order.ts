import { Component } from "@angular/core"
import { Cart } from "../services/cart"
import { ActivatedRoute, RouterLink } from "@angular/router"

@Component({
  selector: 'app-success-order',
  imports: [RouterLink],
  templateUrl: './success-order.html',
  styleUrl: '../success/success.scss',
})
export class SuccessOrder {
  tracking_code:string|null = null // Stores The Tracking Code

  constructor(private cartService:Cart, private route:ActivatedRoute) { }

  // Method Which Executes In Beginning
  ngOnInit() {
    this.cartService.clearCart() // Clears The Whole Cart
    this.tracking_code = this.route.snapshot.queryParamMap.get("code") // Gets The Tracking Code
  }
}