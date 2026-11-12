import { Injectable, inject } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { apiUrl } from "../config/api"

import type { CartItem } from "./cart"

// Delivery Details Of The Customer (Stored In The Local Storage For The Next Order)
export interface Customer {
  first_name:string,
  last_name:string,
  address:string,
  city:string,
  phone_number:string,
  message:string|null
}

export type PaymentMethod = "card" | "cash"

// One Line Sent To The Back-End. Prices Are Calculated There From `id` And `modifier_ids`
// (`title`, `price` And `image` Are Only Used For The Tip Line)
export interface OrderLinePayload {
  id:number,
  quantity:number,
  modifier_ids:number[],
  title:string,
  price:number,
  image:string
}

export interface OrderPayload {
  items:OrderLinePayload[],
  customer:Customer,
  coupon_code:string|null
}

export interface OrderResponse {
  success:boolean,
  message:string,
  url?:string,
  tracking_code?:string
}

export const TIP_ITEM_ID:number = -1 // The Back-End Recognizes The Tip By This ID

// Builds The Order Payload From The Cart (The Tip Is Added As A Pseudo Line For Card Payments)
export function buildOrderPayload(items:CartItem[], customer:Customer, coupon_code:string|null, tip_in_cents:number = 0):OrderPayload {
  const lines:OrderLinePayload[] = items.map(item => ({
    id: item.id,
    quantity: item.quantity,
    modifier_ids: (item.selected_modifiers ?? []).map(modifier => modifier.id),
    title: item.title,
    price: item.price,
    image: item.image
  }))

  if(tip_in_cents > 0) {
    lines.push({ id: TIP_ITEM_ID, quantity: 1, modifier_ids: [], title: "Prepitné", price: tip_in_cents, image: "" })
  }

  return { items: lines, customer, coupon_code }
}

@Injectable({
  providedIn: "root"
})
export class Payment {
  private http:HttpClient = inject(HttpClient)

  // Method For Create The Stripe Checkout Session (Card Payment). Responds With The Stripe URL
  createCheckoutSession(payload:OrderPayload):Observable<OrderResponse> {
    return this.http.post<OrderResponse>(apiUrl("create-checkout-session/"), payload)
  }

  // Method For Create A Cash On Delivery Order. Responds With The Success Page URL
  createCashOrder(payload:OrderPayload):Observable<OrderResponse> {
    return this.http.post<OrderResponse>(apiUrl("create-order/"), payload)
  }
}
