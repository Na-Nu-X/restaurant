import { HttpClient } from "@angular/common/http"
import { Injectable } from "@angular/core"
import { Observable } from "rxjs"

import type { OrderDetails } from "../track-order/track-order"

@Injectable({ providedIn: "root" })
export class Order {
  constructor(private http:HttpClient) {}

  // Method For Get The Order Status
  getOrderStatus(tracking_code:string):Observable<{ 
        success:string,
        message:string,
        order_details?:OrderDetails
    }> {
        return this.http.get<{ 
            success:string,
            message:string,
            order_details?:OrderDetails
        }>(`http://127.0.0.1:8001/api/order-status/${tracking_code}/`) // Returns The Data
    }
}