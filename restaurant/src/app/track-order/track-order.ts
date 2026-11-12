import { Component, DestroyRef, computed, inject, signal } from "@angular/core"
import { ActivatedRoute, Router, RouterLink } from "@angular/router"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"
import { HttpErrorResponse } from "@angular/common/http"

import { BRAND } from "../config/brand.config"
import { Order, OrderDetails, OrderStatus, OrderedItem } from "../services/order"
import { PricePipe } from "../shared/price.pipe"
import { Toast } from "../shared/toast/toast.service"

type LoadState = "loading" | "ready" | "not-found" | "error"

interface StatusCopy {
  title:string,
  text:string,
  tone:"primary"|"success"|"danger"|"warning"
}

const REFRESH_INTERVAL:number = 30_000 // Checks For Status Changes Every 30 Seconds
const ACTIVE_STATUSES:OrderStatus[] = ["PENDING", "PAID", "PREPARING", "DELIVERING"]

export const PROGRESS_STEPS:{ label:string, icon:string }[] = [
  { label: "Prijatá", icon: "fa-solid fa-receipt" },
  { label: "Pripravujeme", icon: "fa-solid fa-fire-burner" },
  { label: "Na ceste", icon: "fa-solid fa-motorcycle" },
  { label: "Doručená", icon: "fa-solid fa-house" }
]

// Index Of The Current Step In `PROGRESS_STEPS` (-1 For Cancelled Orders)
export function progressStep(status:OrderStatus):number {
  switch(status) {
    case "PENDING":
    case "PAID": return 0
    case "PREPARING": return 1
    case "DELIVERING": return 2
    case "COMPLETED": return 3
    default: return -1
  }
}

// Order Tracking Page (/objednavka/:tracking_code): Progress, Ordered Items With Options, Delivery Details And Rating
@Component({
  selector: "app-track-order",
  imports: [RouterLink, PricePipe],
  templateUrl: "./track-order.html",
  styleUrl: "./track-order.scss",
})
export class TrackOrder {
  private orderService:Order = inject(Order)
  private router:Router = inject(Router)
  private toast:Toast = inject(Toast)
  private refresh_timer?:ReturnType<typeof setInterval>

  readonly brand = BRAND
  readonly steps = PROGRESS_STEPS
  readonly stars:number[] = [1, 2, 3, 4, 5]

  readonly state = signal<LoadState>("loading")
  readonly tracking_code = signal<string>("")
  readonly order = signal<OrderDetails|null>(null)
  readonly code_input = signal<string>("")

  // Rating (Dish ID → Stars)
  readonly ratings = signal<Record<number, number>>({})
  readonly sending_rating = signal<boolean>(false)
  readonly rating_sent = signal<boolean>(false)

  readonly step = computed<number>(() => {
    const order = this.order()
    return order ? progressStep(order.status) : -1
  })

  readonly is_active = computed<boolean>(() => ACTIVE_STATUSES.includes(this.order()?.status as OrderStatus))

  readonly created = computed<string>(() => {
    const order = this.order()
    if(!order) return ""

    return new Intl.DateTimeFormat(BRAND.locale, { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(order.creation_time))
  })

  readonly copy = computed<StatusCopy|null>(() => {
    const order = this.order()
    if(!order) return null

    switch(order.status) {
      case "PENDING": return { title: "Čakáme na potvrdenie platby", text: "Ak ste platbu nedokončili, objednávka sa po chvíli automaticky zruší.", tone: "warning" }
      case "PAID": return { title: "Objednávka je zaplatená", text: "Hneď ako ju kuchyňa prevezme, pustíme sa do varenia.", tone: "primary" }
      case "PREPARING": return { title: "Pripravujeme vaše jedlo", text: "Kuchári sa už pustili do práce.", tone: "primary" }
      case "DELIVERING": return { title: "Objednávka je na ceste", text: `Kuriér smeruje na adresu ${order.address}, ${order.city}.`, tone: "primary" }
      case "COMPLETED": return { title: "Objednávka bola doručená", text: "Dobrú chuť! Budeme radi, ak nám dáte vedieť, ako vám chutilo.", tone: "success" }
      case "CANCELLED": return { title: "Objednávka bola zrušená", text: `Ak ide o omyl, zavolajte nám na ${BRAND.contact.phoneDisplay}.`, tone: "danger" }
    }
  })

  // One Rating Row Per Dish (The Same Dish With Different Options Is Rated Once)
  readonly rateable = computed<OrderedItem[]>(() => {
    const seen = new Set<number>()

    return (this.order()?.items ?? []).filter(item => {
      if(item.dish_id === null || seen.has(item.dish_id)) return false
      seen.add(item.dish_id)
      return true
    })
  })

  readonly has_rating = computed<boolean>(() => Object.keys(this.ratings()).length > 0)

  constructor() {
    const route:ActivatedRoute = inject(ActivatedRoute)
    const destroy_ref:DestroyRef = inject(DestroyRef)

    // Reloads When The Code In The URL Changes (e.g. After Entering Another Code)
    route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const code:string = (params.get("tracking_code") ?? "").toUpperCase()

      this.tracking_code.set(code)
      this.code_input.set("")
      this.order.set(null)
      this.rating_sent.set(false)
      this.load()
    })

    destroy_ref.onDestroy(() => this.stopRefresh())
  }

  // Method For Load The Order (Silent Reloads Keep The Current Content On Errors)
  load(silent:boolean = false):void {
    const code:string = this.tracking_code()
    if(!code) { this.state.set("not-found"); return }

    if(!silent) this.state.set("loading")

    this.orderService.getOrderStatus(code).subscribe({
      next:(response) => {
        if(response?.success && response.order_details) {
          this.setOrder(response.order_details)
          this.state.set("ready")
        }

        else if(!silent) {
          this.state.set("not-found")
        }
      },

      error:(error:HttpErrorResponse) => {
        if(silent) return
        this.state.set(error.status === 404 ? "not-found" : "error")
      }
    })
  }

  private setOrder(order:OrderDetails):void {
    const previous:OrderStatus|undefined = this.order()?.status
    this.order.set(order)

    // Keeps The Stars The Customer Is Choosing, Fills In The Ones Saved Earlier
    if(!previous || previous !== order.status) {
      const saved:Record<number, number> = {}
      order.items.forEach(item => { if(item.dish_id !== null && item.rating) saved[item.dish_id] = item.rating })
      this.ratings.set({ ...saved, ...this.ratings() })
    }

    if(previous && previous !== order.status) this.toast.show(`Stav objednávky: ${this.copy()?.title}`)

    // Refreshes Only While The Order Is In Progress (And Only In The Browser)
    if(ACTIVE_STATUSES.includes(order.status)) this.startRefresh()
    else this.stopRefresh()
  }

  private startRefresh():void {
    if(this.refresh_timer || typeof window === "undefined") return
    this.refresh_timer = setInterval(() => this.load(true), REFRESH_INTERVAL)
  }

  private stopRefresh():void {
    clearInterval(this.refresh_timer)
    this.refresh_timer = undefined
  }

  // Method For Open Another Order From The "Not Found" Form
  findOrder():void {
    const code:string = this.code_input().trim().toUpperCase()
    if(code) this.router.navigate(["/objednavka", code])
  }

  /******************************************************************************
   Rating
  ******************************************************************************/

  rate(dish_id:number, stars:number):void {
    this.ratings.update(ratings => ({ ...ratings, [dish_id]: stars }))
    this.rating_sent.set(false)
  }

  sendRating():void {
    const all_ratings = Object.entries(this.ratings()).map(([dish_id, rating]) => ({ dish_id: Number(dish_id), rating }))

    if(all_ratings.length === 0 || this.sending_rating()) return

    this.sending_rating.set(true)

    this.orderService.sendRating(this.tracking_code(), all_ratings).subscribe({
      next:(response) => {
        this.sending_rating.set(false)

        if(response?.success) {
          this.rating_sent.set(true)
          this.toast.success("Ďakujeme za vaše hodnotenie!")
        }

        else {
          this.toast.error(response?.message || "Hodnotenie sa nepodarilo odoslať.")
        }
      },

      error:(error:HttpErrorResponse) => {
        console.error(error) // Shows The Error
        this.sending_rating.set(false)
        this.toast.error(error.error?.message || "Pri odosielaní hodnotenia došlo k chybe.")
      }
    })
  }
}
