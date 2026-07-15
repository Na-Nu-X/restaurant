import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"

import type { CartItem } from "./cart"

@Injectable({
  providedIn: "root"
})
export class Payment {
  private api_url:string = "http://127.0.0.1:8001/api/create-checkout-session/" // Connection To The Back-End API

  constructor(private http: HttpClient) {}

  // Method For Create The Checkout Session
  createCheckoutSession(items:CartItem[], tip_in_cents:number, selected_tip:number):Observable<{ 
        success:string,
        message:string,
        url?:string 
    }> {
      const items_to_send:CartItem[] = [...items] // Saves The Copy Of Items

      // If The Tip Is Selected
      if(tip_in_cents > 0) {
        // Adds The Tip To The Cart Items
        items_to_send.push({
          id: -1,
          title: `Tringelt (${selected_tip}%)`,
          description: "",
          price: tip_in_cents,
          image: "tip"
        })
      }

    return this.http.post<{ 
      success:string,
      message:string,
      url?:string 
    }>(this.api_url, { items: items_to_send }) // Returns The Data
  }
}