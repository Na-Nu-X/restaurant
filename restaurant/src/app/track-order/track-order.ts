import { Component } from "@angular/core"
import { Order } from "../services/order"
import { ActivatedRoute } from "@angular/router"
import { CommonModule } from "@angular/common"

import type { Cart, CartItem } from "../services/cart"

export interface OrderDetails {
  id:number,
  tracking_code:string,
  first_name:string,
  last_name:string,
  address:string,
  city:string,
  phone_number:string,
  total_price:number,
  status:"PENDING"|"PAID"|"PREPARING"|"DELIVERING"|"COMPLETED"|"CANCELLED"
  cash_on_delivery:boolean,
  creation_time:string
}

@Component({
  selector: 'app-track-order',
  imports: [CommonModule],
  templateUrl: './track-order.html',
  styleUrl: './track-order.scss',
})
export class TrackOrder {
  tracking_code:string|null = null // Stores The Tracking Code
  order_details:OrderDetails|null = null // Stores The Order Details
  ordered_items:(CartItem & { selected_rating?:number; hovered_rating?:number })[] | null = null // Stores The Ordered Items
  current_index:number = 0 // Stores The Current Index Of The Active Item

  constructor(private orderService:Order, private route: ActivatedRoute) { }

  ngOnInit():void {
    this.tracking_code = this.route.snapshot.paramMap.get('tracking_code')

    if(this.tracking_code) {
      // Gets The Order Status
      this.orderService.getOrderStatus(this.tracking_code).subscribe({
        next:(response) => {
          if(response && response.success && response.order_details) {
            this.order_details = response.order_details // Sets The Order Details
            if(this.order_details.status === "COMPLETED") this.getOrderedItems(this.order_details.id) // Gets All Ordered And Delivered Items
          } 
          
          else {
            console.error(response.message) // Shows The Error Message
          }
        },

        error:(error) => {
          console.error(error) // Shows The Error
          alert("Pri načítavaní objednávky došlo k chybe.") // Shows The Alert
        }
      })
    }
  }

  // Method For Get All Ordered And Delivered Items
  getOrderedItems(order_id:number):void {
    // Gets The Ordered Items
    this.orderService.getOrderedItems(order_id).subscribe({
      next:(response) => {
        if(response && response.success) {
          this.ordered_items = response.ordered_items // Sets The Ordered Items
        } 
        
        else {
          console.error(response.message) // Shows The Error Message
        }
      },

      error:(error) => {
        console.error(error) // Shows The Error
        alert("Pri načítavaní položiek došlo k chybe.") // Shows The Alert
      }
    })
  }

  // Method For Reload The Page
  reloadPage():void {
    window.location.reload()
  }

  // Method For Change The Cart Item
  changeCartItem(index:number):void {
    this.current_index = index // Changes The Current Index Of The Active Item
  }

  // Method For Update The Hovered Rating
  updateHoveredRating(item:CartItem, rating:number):void {
    (item as any).hovered_rating = rating // Updates The Hovered Rating
  }

  // Method For Remove The Hovered Rating
  removeHoveredRating(item:CartItem):void {
    (item as any).hovered_rating = 0 // Removes The Hovered Rating
  }

  // Method For Set The Selected Rating
  setRating(item:CartItem, star:number):void {
    (item as any).selected_rating = star // Sets The Selected Rating
  }

  // Method For Send The Rating
  sendRating():void {
    if(!this.ordered_items || !this.tracking_code) return

    // Gets All Ratings
    const all_ratings:{
      dish_id:number,
      rating:number
    }[] = this.ordered_items
          .filter((one_item:CartItem) => (one_item as any).selected_rating && (one_item as any).selected_rating > 0)
          .map((one_item:CartItem) => ({
            dish_id: one_item.id,
            rating: (one_item as any).selected_rating
          }))

    if(all_ratings.length === 0) {
      alert("Pred odoslaním ohodnoť aspoň jedno jedlo.") // Shows The Alert
      return
    }

    // Sends The Rating
    this.orderService.sendRating(this.tracking_code, all_ratings).subscribe({
      next:(response) => {
        if(response && response.success) {
          alert("Ďakujeme za tvoje hodnotenie!") // Shows The Alert
        } 
        
        else {
          console.error(response.message) // Shows The Error Message
        }
      },

      error:(error) => {
        console.error(error) // Shows The Error
        alert("Pri odosielaní hodnotenia došlo k chybe.") // Shows The Alert
      }
    })
  }
}