import { Component, OnInit, computed, inject, signal } from "@angular/core"
import { ActivatedRoute, RouterLink } from "@angular/router"

import { BRAND } from "../config/brand.config"
import { Cart } from "../services/cart"
import { Order, OrderDetails } from "../services/order"
import { PricePipe } from "../shared/price.pipe"

export type ConfirmationKind = "card" | "cash"

// Thank-You Page After An Order. Used By `/success` (Paid By Card) And `/success-order` (Cash On Delivery)
// The Kind Comes From The Route Data, The Tracking Code From The `?code=` Query Parameter
@Component({
  selector: "app-order-confirmation",
  imports: [RouterLink, PricePipe],
  templateUrl: "./order-confirmation.html",
  styleUrl: "./order-confirmation.scss",
})
export class OrderConfirmation implements OnInit {
  private route:ActivatedRoute = inject(ActivatedRoute)
  private cartService:Cart = inject(Cart)
  private orderService:Order = inject(Order)

  readonly brand = BRAND
  readonly kind:ConfirmationKind = this.route.snapshot.data["kind"] === "cash" ? "cash" : "card"

  readonly tracking_code = signal<string|null>(null)
  readonly order = signal<OrderDetails|null>(null)
  readonly copied = signal<boolean>(false)

  readonly title = computed<string>(() => this.kind === "card" ? "Platba prebehla úspešne!" : "Objednávka je prijatá!")
  readonly first_name = computed<string|null>(() => this.order()?.first_name ?? null)

  ngOnInit():void {
    this.cartService.clearCart() // The Order Was Created, The Cart Is No Longer Needed

    const code:string|null = this.route.snapshot.queryParamMap.get("code")
    this.tracking_code.set(code ? code.toUpperCase() : null)

    // Loads The Order To Show The Name And The Amount (Optional, The Page Works Without It)
    if(code) {
      this.orderService.getOrderStatus(code).subscribe({
        next:(response) => { if(response?.success && response.order_details) this.order.set(response.order_details) },
        error:(error) => console.error(error)
      })
    }
  }

  // Method For Copy The Tracking Code To The Clipboard
  copyCode():void {
    const code:string|null = this.tracking_code()
    if(!code || typeof navigator === "undefined" || !navigator.clipboard) return

    navigator.clipboard.writeText(code).then(() => {
      this.copied.set(true)
      setTimeout(() => this.copied.set(false), 2000)
    }).catch(() => { /* Clipboard Not Allowed – The Code Is Still Visible */ })
  }
}
