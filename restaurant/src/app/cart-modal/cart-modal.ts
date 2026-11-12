import { 
  Component, 
  ViewChild, 
  ElementRef,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from "@angular/core"

import { CurrencyPipe, CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Subscription } from "rxjs"
import { Cart } from "../services/cart"
import { Payment } from "../services/payment"
import { Status } from "../services/status"

import type { CartItem } from "../services/cart"

export interface Customer {
  first_name:string,
  last_name:string,
  address:string,
  city:string,
  phone_number:string,
  message:string|null
}

@Component({
  selector: "app-cart-modal",
  imports: [CurrencyPipe, CommonModule, FormsModule],
  templateUrl: "./cart-modal.html",
  styleUrl: "./cart-modal.scss",
})

export class CartModal implements OnInit, OnDestroy {
  is_open:boolean = false // Stores The Information If The Restaurant Is Open
  cart_items!:CartItem[]
  current_index:number = 0 // Stores The Current Index Of The Active Item
  coupon_code:string = "" // Stores The Entered Coupon Code
  applied_coupon:string|null = null // Stores The Applied Coupon Code
  applied_discount:number = 0 // Stores The Applied Discount
  coupon_message:string = "" // Stores The Coupon Message
  selected_tip:number = 10 // Stores The Selected Tip Percentage (10% By Default)

  // Stores The Customer's Delivery Data
  customer:Customer = {
    first_name: "",
    last_name: "",
    address: "",
    city: "",
    phone_number: "",
    message: null
  }

  private subscriptions:Subscription = new Subscription()

  constructor(private cartService:Cart, private paymentService:Payment, private cdr:ChangeDetectorRef, private StatusService:Status) { }

  // Method Which Executes In Beginning
  ngOnInit():void {
    // Gets The Current Status
    this.subscriptions.add(this.StatusService.status$.subscribe((response) => {
      this.is_open = !!(response.success && response.is_open) // Sets The Information If Is Open
      this.cdr.markForCheck()
    }))

    // Opens The Cart Whenever Another Component Asks For It (e.g. The Header Button)
    this.subscriptions.add(this.cartService.open_requests$.subscribe(() => this.showCart()))

    this.customer = this.loadCustomerFromStorage() // Loads The Customer Data From The Local Storage
  }

  ngOnDestroy():void {
    this.subscriptions.unsubscribe()
  }

  // Method For Save The Customer's Delivery Data To The Local Storage
  private saveCustomerToStorage():void {
    if(typeof window !== "undefined") localStorage.setItem("customer", JSON.stringify(this.customer)) // Saves The Customer Data To The Local Storage
  }

  // Method For Load The Customer's Delivery Data From The Local Storage
  private loadCustomerFromStorage():Customer {
    if(typeof window !== "undefined") {
      const stored_customer_data:string|null = localStorage.getItem("customer") || null // Gets The Stored Customer Data

      if(stored_customer_data) {
        return JSON.parse(stored_customer_data) // Returns The Customer Data If There Are Any
      }
    }

    // Returns An Empty Customer Data
    return {
      first_name: "",
      last_name: "",
      address: "",
      city: "",
      phone_number: "",
      message: null
    }
  }

  @ViewChild("cart", { static: false }) cart!:ElementRef<HTMLDialogElement> // Gets The Cart Dialog

  // Method To Show The Cart Dialog
  showCart():void {
    this.cart_items = this.cartService.cart_items$ // Sets The Cart Items
    this.current_index = 0 // Resets The Current Index Of The Active Item
    this.cart.nativeElement.showModal() // Shows The Cart Dialog
  }

  // Method For Close The Cart Dialog By Clicking Outside
  closeCartOutside(event:MouseEvent):void {
    const cart_dialog:HTMLDialogElement = this.cart.nativeElement // Gets The Cart Dialog
    if(event.target === cart_dialog) cart_dialog.close() // Closes The Cart Dialog
  }

  // Method To Close The Cart Dialog
  closeCart():void {
    this.cart.nativeElement.close() // Closes The Cart Dialog
  }

  // Method For Change The Cart Item
  changeCartItem(index:number):void {
    this.current_index = index // Changes The Current Index Of The Active Item
  }

  // Method For Remove The Item From Cart
  removeFromCart(index:number):void {
    this.cartService.removeFromCart(index) // Removes The Item From Cart
    this.current_index = 0 // Resets The Current Index Of The Active Item
  }

  // Method For Validate The Applied Coupon
  validateCoupon():void {
    if(!this.coupon_code) return // Do Nothing If The Coupon Wasn't Entered

    // Validates The Coupon
    this.cartService.validateCoupon(this.coupon_code).subscribe({
      next:(response) => {
        if(response && response.success && response.code && response.discount_percent) {
          this.applied_coupon = response.code // Sets The Applied Coupon Code
          this.applied_discount = response.discount_percent // Sets The Applied Discount
          this.coupon_message = `Kupón ${response.code} (${response.discount_percent}%) bol uplatnený!` // Sets The Coupon Message
        }
        
        else {
          this.applied_coupon = null // Removes The Applied Coupon Code
          this.applied_discount = 0 // Removes The Applied Discount
          this.coupon_message = response.message // Sets The Coupon Message
        }

        this.cdr.detectChanges() // Rerenders The HTML
      },

      error:(error) => {
        this.coupon_message = error.error?.message || "Pri aktivácii kupónu došlo k chybe." // Sets The Coupon Message

        this.cdr.detectChanges() // Rerenders The HTML
      }
    })
  }

  // Method For Remove The Coupon
  removeCoupon():void {
    this.coupon_code = ""
    this.applied_coupon = null
    this.applied_discount = 0
    this.coupon_message = ""
  }

  // Method For Change The Tip Amount
  changeTipAmount(value:string):void {
    this.selected_tip = parseInt(value, 10) // Sets The Selected Tip
  }

  // Getter To Get The Total Price In Cents (Subtotal Without Discount)
  get total_price():number {
    if(!this.cart_items || this.cart_items.length === 0) return 0 // Returns 0
    return this.cart_items.reduce((sum, one_item) => sum + (one_item.price * (one_item.quantity || 1)), 0) // Returns The Total Price In Cents
  }

  // Getter To Get The Discount Multiplier (10% = 0.9)
  get discount_multiplier():number {
    if(!this.applied_discount || this.applied_discount <= 0) return 1.0 // Returns 1x
    return (100 - this.applied_discount) / 100 // Returns The Discount Multiplier
  }

  // Getter To Get The Price After Discount In Cents
  get discounted_total_price():number {
    if(!this.cart_items || this.cart_items.length === 0) return 0 // Returns 0
    
    // Returns The Discounted Total Price In Cents
    return this.cart_items.reduce((sum, one_item) => {
      const quantity:number = one_item.quantity || 1
      const discounted_unit:number = Math.round(one_item.price * this.discount_multiplier)
      return sum + (discounted_unit * quantity)
    }, 0)
  }

  // Getter To Get The Discount Amount
  get discount_amount():number {
    return this.total_price - this.discounted_total_price // Returns The Discount Amount
  }

  // Getter To Get The Tip Amount In Cents
  get tip_amount():number {
    if(!this.selected_tip || this.selected_tip <= 0) return 0 // Returns 0
    return Math.round(this.discounted_total_price * (this.selected_tip / 100)) // Returns The Tip In Cents
  }

  // Getter To Get The Grand Total Price (Price Of Items - Discount + Tip)
  get grand_total_price():number {
    return this.discounted_total_price + this.tip_amount // Returns The Grand Total Price
  }

  // Getter To Get The Total Price After Discount Without The Tip (For Cash On Delivery)
  get price_after_discount():number {
    return this.discounted_total_price // Returns The Total Price After Discount
  }

  // Method For Pay All Items In Cart
  payAll():void {
    // If The Cart Is Empty
    if(!this.cart_items || this.cart_items.length === 0) {
      alert("Košík je prázdny.") // Shows The Alert
      return
    }

    // If The Customer's Delivery Details Isn't Filled
    if (
      !this.customer.first_name.trim() ||
      !this.customer.last_name.trim() ||
      !this.customer.address.trim() ||
      !this.customer.city.trim() ||
      !this.customer.phone_number.trim()
    ) {
      alert("Prosím, vyplňte všetky povinné kontaktné údaje pre doručenie.") // Shows The Alert
      return
    }

    this.saveCustomerToStorage() // Updates The Customer's Delivery Data In The Local Storage

    // Creates The Checkout Session
    this.paymentService.createCheckoutSession(
      this.cart_items, 
      this.tip_amount, 
      this.selected_tip,
      this.customer,
      this.applied_coupon
    ).subscribe({
      next:(response) => {
        if(response && response.success && response.url) {
          window.location.href = response.url // Redirects To The Responded URL
        } 
        
        else {
          console.error(response.message) // Shows The Error Message
        }
      },

      error:(error) => {
        console.error(error) // Shows The Error
        
        const message:string = error.error?.message || "Pri spracovávaní platby došlo k chybe." // Sets The Error Message
        alert(message) // Shows The Alert
      }
    })
  }

  // Method For Order All Items In Cart (Pay With Cash On Delivery)
  orderAll():void {
    // If The Cart Is Empty
    if(!this.cart_items || this.cart_items.length === 0) {
      alert("Košík je prázdny.") // Shows The Alert
      return
    }

    // If The Customer's Delivery Details Isn't Filled
    if (
      !this.customer.first_name.trim() ||
      !this.customer.last_name.trim() ||
      !this.customer.address.trim() ||
      !this.customer.city.trim() ||
      !this.customer.phone_number.trim()
    ) {
      alert("Prosím, vyplňte všetky povinné kontaktné údaje pre doručenie.") // Shows The Alert
      return
    }

    this.saveCustomerToStorage() // Updates The Customer's Delivery Data In The Local Storage

    // Creates The Checkout Session
    this.paymentService.orderAll(
      this.cart_items, 
      this.customer,
      this.applied_coupon
    ).subscribe({
      next:(response) => {
        if(response && response.success && response.url) {
          window.location.href = response.url // Redirects To The Responded URL
        } 
        
        else {
          console.error(response.message) // Shows The Error Message
        }
      },

      error:(error) => {
        console.error(error) // Shows The Error
        
        const message:string = error.error?.message || "Pri spracovávaní objednávky došlo k chybe." // Sets The Error Message
        alert(message) // Shows The Alert
      }
    })
  }
}