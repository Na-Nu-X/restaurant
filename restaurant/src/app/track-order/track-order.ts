import { Component } from "@angular/core"
import { Order } from "../services/order"
import { ActivatedRoute } from "@angular/router"
import { CommonModule } from "@angular/common"

export interface OrderDetails {
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

  constructor(private orderService:Order, private route: ActivatedRoute) { }

  ngOnInit():void {
    this.tracking_code = this.route.snapshot.paramMap.get('tracking_code')

    if(this.tracking_code) {
      // Gets The Order Status
      this.orderService.getOrderStatus(this.tracking_code).subscribe({
        next:(response) => {
          if(response && response.success && response.order_details) {
            this.order_details = response.order_details // Sets The Order Details
          } 
          
          else {
            console.error(response.message) // Shows The Error Message
          }
        },

        error:(error) => {
          console.error(error) // Shows The Error
          // alert("Pri načítavaní objednávky došlo k chybe.") // Shows The Alert
        }
      })
    }
  }
}