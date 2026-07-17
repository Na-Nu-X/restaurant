import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"

import type { CartItem } from "./cart"
import type { Customer } from "../navigation-bar/navigation-bar"

@Injectable({
  providedIn: "root"
})
export class Payment {
  constructor(private http: HttpClient) {}

  // Method For Create The Checkout Session
  createCheckoutSession(items:CartItem[], tip_in_cents:number, selected_tip:number, customer:Customer):Observable<{ 
        success:string,
        message:string,
        url?:string 
    }> {
      const api_url:string = "http://127.0.0.1:8001/api/create-checkout-session/" // Connection To The Back-End API
      const items_to_send:CartItem[] = [...items] // Saves The Copy Of Items

      // If The Tip Is Selected
      if(tip_in_cents > 0) {
        // Adds The Tip To The Cart Items
        items_to_send.push({
          id: -1,
          title: `Tringelt (${selected_tip}%)`,
          description: "",
          price: tip_in_cents,
          quantity: 1,
          image: "tip",
          allergens: []
        })
      }

    // Returns The Data
    return this.http.post<{ 
      success:string,
      message:string,
      url?:string 
    }>(api_url, { 
      items: items_to_send, customer 
    })
  }

  // Method For Order All Items In Cart (Pay With Cash On Delivery)
  orderAll(items:CartItem[], customer:Customer):Observable<{ 
        success:string,
        message:string,
        url?:string 
    }> {
      const api_url:string = "http://127.0.0.1:8001/api/create-order/" // Connection To The Back-End API
      const items_to_send:CartItem[] = [...items] // Saves The Copy Of Items

    // Returns The Data
    return this.http.post<{ 
      success:string,
      message:string,
      url?:string 
    }>(api_url, { 
      items: items_to_send, customer 
    })
  }
}