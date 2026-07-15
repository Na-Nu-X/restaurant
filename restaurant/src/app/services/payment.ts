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
  createCheckoutSession(items:CartItem[]):Observable<{ 
        success:string,
        message:string,
        url?:string 
    }> {
    return this.http.post<{ 
        success:string,
        message:string,
        url?:string 
    }>(this.api_url, { items }) // Returns The Data
  }
}