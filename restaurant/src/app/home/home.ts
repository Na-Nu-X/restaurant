import { Component } from "@angular/core"
import { Banner } from "../banner/banner"
import { DailyMenu } from "../daily-menu/daily-menu"
import { SearchBar } from "../search-bar/search-bar"
import { Catalog } from "../catalog/catalog"
import { ContactForm } from "../contact-form/contact-form"
import { Map } from "../map/map"
import { ActivatedRoute } from "@angular/router"
import { Order } from "../services/order"

@Component({
  selector: "app-home",
  imports: [
    Banner,
    DailyMenu,
    SearchBar,
    Catalog,
    ContactForm,
    Map
  ],
  templateUrl: "./home.html",
  styleUrl: "./home.scss"
})
export class Home { 
  cancel_order_code:string|null = null // Stores The Tracking Code Of Order To Cancel

  constructor(private route:ActivatedRoute, private orderService:Order) { }

  // Method Which Executes In Beginning
  ngOnInit() {
    this.cancel_order_code = this.route.snapshot.queryParamMap.get("cancel_order_code") // Gets The Cancel Order Tracking Code
    
    if(this.cancel_order_code) {
      // Cancels The Order
      this.orderService.cancelOrder(this.cancel_order_code).subscribe({
        next:(response) => {
          if(response && response.success) {
            // Cancelled Order
          } 
          
          else {
            console.error(response.message) // Shows The Error Message
          }
        },

        error:(error) => {
          console.error(error) // Shows The Error
        }
      })
    }
  }
}