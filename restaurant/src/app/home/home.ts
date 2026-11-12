import { Component, afterNextRender, inject } from "@angular/core"
import { Banner } from "../banner/banner"
import { DailyMenu } from "../daily-menu/daily-menu"
import { Catalog } from "../catalog/catalog"
import { ContactSection } from "../contact-section/contact-section"
import { ActivatedRoute, Router } from "@angular/router"
import { Order } from "../services/order"
import { SECTIONS, SectionScroll } from "../shared/section-scroll"
import { Toast } from "../shared/toast/toast.service"
import { Cart } from "../services/cart"

@Component({
  selector: "app-home",
  imports: [
    Banner,
    DailyMenu,
    Catalog,
    ContactSection
  ],
  templateUrl: "./home.html",
  styleUrl: "./home.scss"
})
export class Home { 
  readonly sections = SECTIONS
  private toast:Toast = inject(Toast)
  private router:Router = inject(Router)
  private cartService:Cart = inject(Cart)
  cancel_order_code:string|null = null // Stores The Tracking Code Of Order To Cancel

  constructor(private route:ActivatedRoute, private orderService:Order) {
    const section_scroll:SectionScroll = inject(SectionScroll)

    // Scrolls To The Requested Section When Arriving From Another Page (e.g. "/#menu")
    afterNextRender(() => section_scroll.scrollToFragment(this.route.snapshot.fragment))
  }

  // Method Which Executes In Beginning
  ngOnInit() {
    this.cancel_order_code = this.route.snapshot.queryParamMap.get("cancel_order_code") // Gets The Cancel Order Tracking Code
    
    if(this.cancel_order_code) {
      // Removes The Code From The URL, So A Reload Does Not Repeat This
      this.router.navigate([], { queryParams: { cancel_order_code: null }, queryParamsHandling: "merge", replaceUrl: true })

      // Cancels The Unpaid Order (The Customer Left Stripe Checkout)
      this.orderService.cancelOrder(this.cancel_order_code).subscribe({
        next:(response) => {
          if(response && response.success) {
            this.toast.show("Platba bola zrušená. Váš košík sme ponechali, objednávku môžete dokončiť kedykoľvek.", {
              duration: 8000,
              action: { label: "Otvoriť košík", run: () => this.cartService.openCart() }
            })
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