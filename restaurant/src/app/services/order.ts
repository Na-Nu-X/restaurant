import { HttpClient } from "@angular/common/http"
import { Injectable } from "@angular/core"
import { Observable } from "rxjs"
import { apiUrl } from "../config/api"


export type OrderStatus = "PENDING" | "PAID" | "PREPARING" | "DELIVERING" | "COMPLETED" | "CANCELLED"

// One Ordered Dish (The Tip Is Not Included)
export interface OrderedItem {
  line_id:number,
  dish_id:number|null, // null When The Dish Was Deleted From The Menu
  title:string,
  image:string|null,
  quantity:number,
  unit_price:number, // In Cents, After The Discount, Including The Options
  modifiers:string[],
  rating:number|null // Rating Already Given By The Customer
}

export interface OrderDetails {
  id:number,
  tracking_code:string,
  first_name:string,
  last_name:string,
  address:string,
  city:string,
  phone_number:string,
  message:string|null,
  price:number, // Dishes After The Discount
  tip:number,
  total_price:number,
  status:OrderStatus,
  cash_on_delivery:boolean,
  creation_time:string,
  items:OrderedItem[]
}

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
        }>(apiUrl(`cancel-order/${tracking_code}/`))
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
        }>(apiUrl(`order-status/${tracking_code}/`))
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
        }>(apiUrl("send-rating/"), all_ratings_to_send)
    }
}