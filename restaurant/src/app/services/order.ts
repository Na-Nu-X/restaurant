import { HttpClient } from "@angular/common/http"
import { Injectable } from "@angular/core"
import { Observable } from "rxjs"

import type { OrderDetails } from "../track-order/track-order"
import type { CartItem } from "./cart"

@Injectable({ providedIn: "root" })
export class Order {
    constructor(private http:HttpClient) {}

    // Method For Cancel The Order
    cancelOrder(tracking_code:string):Observable<{ 
        success:string,
        message:string
    }> {
        // Returns The Data
        return this.http.get<{ 
            success:string,
            message:string
        }>(`http://127.0.0.1:8001/api/cancel-order/${tracking_code}/`)
    }

    // Method For Get The Order Status
    getOrderStatus(tracking_code:string):Observable<{ 
        success:string,
        message:string,
        order_details?:OrderDetails
    }> {
        // Returns The Data
        return this.http.get<{ 
            success:string,
            message:string,
            order_details?:OrderDetails
        }>(`http://127.0.0.1:8001/api/order-status/${tracking_code}/`)
    }

    // Method For Get All Ordered And Delivered Items
    getOrderedItems(order_id:number):Observable<{ 
        success:string,
        message:string,
        ordered_items:CartItem[]
    }> {
        // Returns The Data
        return this.http.get<{ 
            success:string,
            message:string,
            ordered_items:CartItem[]
        }>(`http://127.0.0.1:8001/api/ordered-items/${order_id}/`)
    }

    // Method For Send The Rating
    sendRating(
        tracking_code:string, 

        all_ratings:{
            dish_id:number,
            rating:number
        }[]
    ):Observable<{
        success:string,
        message:string
    }> {
        // Saves The Copy Of All Ratings
        const all_ratings_to_send = {
            tracking_code: tracking_code,
            all_ratings: all_ratings
        }
        
        // Returns The Data
        return this.http.post<{
            success:string,
            message:string
        }>("http://127.0.0.1:8001/api/send-rating/", all_ratings_to_send)
    }
}