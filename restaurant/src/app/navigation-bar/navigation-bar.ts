import { 
  Component, 
  HostListener, 
  afterNextRender, 
  ViewChild, 
  ElementRef,
  OnInit
} from "@angular/core"

import { 
  AsyncPipe, 
  CurrencyPipe,
  CommonModule
} from "@angular/common"

import { Cart } from "../services/cart"
import { Payment } from "../services/payment"
import { Observable } from "rxjs"

import type { CartItem } from "../services/cart"

@Component({
  selector: "app-navigation-bar",
  imports: [AsyncPipe, CurrencyPipe, CommonModule],
  templateUrl: "./navigation-bar.html",
  styleUrl: "./navigation-bar.scss",
})

export class NavigationBar implements OnInit {
  is_open:boolean = false // Stores The Information If The Menu Is Open
  is_scrolled:boolean = false  // Stores The Information If The Page Is Scrolled
  cart_amount$!:Observable<number>
  cart_items!:CartItem[]
  current_index:number = 0 // Stores The Current Index Of The Active Item
  
  constructor(private cartService:Cart, private paymentService:Payment) {
    afterNextRender(() => {
      this.checkWindowWidth(window.innerWidth)
      this.onWindowScroll()
    })
  }

  // Method Which Executes In Beginning
  ngOnInit() {
    this.cart_amount$ = this.cartService.cart_amount$ // Sets The Cart Amount
  }

  // Method For Toggle The Menu
  toggleMenu():void {
    this.is_open = !this.is_open // Shows / Hides The Menu
  }

  // Window Scroll Functionality
  @HostListener("window:scroll", [])
  onWindowScroll():void {
    if(typeof window !== "undefined") {
      this.is_scrolled = window.scrollY > 50 // Updates The Information If The Page Is Scrolled
    }
  }

  // Window Resize Functionality
  @HostListener("window:resize", ["$event"])
  onResize(event:any):void {
    this.checkWindowWidth(event.target.innerWidth)
  }

  // Method For Check The Window Width
  private checkWindowWidth(width:number):void {
    if(width > 600) {
      this.is_open = false // Hides The Menu
    }
  }

  @ViewChild("all_dishes", { static: false }) all_dishes!:ElementRef<HTMLElement> // Gets The All Dishes Section

  scrollTo(selector:string):void {
    if(typeof document !== "undefined") {
      const element:HTMLElement|null = document.querySelector(selector) as HTMLElement || null // Gets The Element

      if(element) {
        const OFFSET:number = 60 + 20 + 45 + 20 // Defines The Offset (Navigation Bar + Padding + Search Bar)
        const element_position:number = element.getBoundingClientRect().top + window.scrollY // Gets The Element's Position

        window.scrollTo({ top: element_position - OFFSET, behavior: "smooth" }) // Starts The Scroll Animation
      }
    }
  }

  @ViewChild("cart", { static: false }) cart!:ElementRef<HTMLDialogElement> // Gets The Cart Dialog

  // Method To Show The Cart Dialog
  showCart():void {
    this.cart_items = this.cartService.cart_items$ // Sets The Cart Items
    this.current_index = 0 // Resets The Current Index Of The Active Item
    this.cart.nativeElement.showModal() // Shows The Cart Dialog
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

  // Getter To Get The Total Price
  get total_price(): number {
    if(!this.cart_items || this.cart_items.length === 0) {
      return 0 // Returns 0
    }
    
    const total_in_cents:number = this.cart_items.reduce((sum, item) => sum + item.price, 0) // Calculates The Total Price In Cents
    
    return total_in_cents // Returns The Total Price In Cents
  }

  // Method For Pay All Items In Cart
  payAll():void {
    // If The Cart Is Empty
    if(!this.cart_items || this.cart_items.length === 0) {
      alert("Košík je prázdny.") // Shows The Alert
      return
    }

    // Creates The Checkout Session
    this.paymentService.createCheckoutSession(this.cart_items).subscribe({
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
        alert("Pri spracovávaní platby došlo k chybe.") // Shows The Alert
      }
    })
  }
}