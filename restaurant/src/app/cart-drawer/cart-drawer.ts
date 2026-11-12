import {
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from "@angular/core"

import { HttpErrorResponse } from "@angular/common/http"
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop"

import { BRAND } from "../config/brand.config"
import { Cart, CartItem, MAX_LINE_QUANTITY, calculateTotals } from "../services/cart"
import { Customer, Payment, PaymentMethod, buildOrderPayload } from "../services/payment"
import { Status } from "../services/status"
import { PricePipe } from "../shared/price.pipe"
import { SECTIONS, SectionScroll } from "../shared/section-scroll"

type Step = "cart" | "details"
type CustomerField = Exclude<keyof Customer, "message">

const CUSTOMER_STORAGE_KEY:string = "customer"
const PHONE_PATTERN:RegExp = /^\+?[0-9][0-9 ()/-]{7,}$/

const EMPTY_CUSTOMER:Customer = { first_name: "", last_name: "", address: "", city: "", phone_number: "", message: null }

// Validates The Delivery Form. Returns The Error Message Of Every Invalid Field
export function validateCustomer(customer:Customer):Partial<Record<CustomerField, string>> {
  const errors:Partial<Record<CustomerField, string>> = {}

  if(!customer.first_name.trim()) errors.first_name = "Zadajte meno."
  if(!customer.last_name.trim()) errors.last_name = "Zadajte priezvisko."
  if(!customer.address.trim()) errors.address = "Zadajte ulicu a číslo domu."
  if(!customer.city.trim()) errors.city = "Zadajte mesto."

  if(!customer.phone_number.trim()) errors.phone_number = "Zadajte telefónne číslo."
  else if(!PHONE_PATTERN.test(customer.phone_number.trim())) errors.phone_number = "Zadajte platné telefónne číslo, napr. +421 900 123 456."

  return errors
}

// Cart Drawer With A Two-Step Checkout: 1) Cart, 2) Delivery Details And Payment
// Full Screen On Phones, Side Panel From 768px Up
@Component({
  selector: "app-cart-drawer",
  imports: [PricePipe],
  templateUrl: "./cart-drawer.html",
  styleUrl: "./cart-drawer.scss",
})
export class CartDrawer {
  private cartService:Cart = inject(Cart)
  private paymentService:Payment = inject(Payment)
  private sectionScroll:SectionScroll = inject(SectionScroll)
  private document:Document = inject(DOCUMENT)
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog")

  readonly tip_options:number[] = BRAND.checkout.tipOptions
  readonly max_quantity:number = MAX_LINE_QUANTITY

  readonly items = this.cartService.items
  readonly count = this.cartService.count
  readonly status = toSignal(inject(Status).status$, { initialValue: null })

  readonly is_open = signal<boolean>(false) // Drawer Visibility
  readonly last_removed = signal<{ item:CartItem, index:number }|null>(null) // Line That Can Still Be Restored
  private undo_timer?:ReturnType<typeof setTimeout>
  readonly step = signal<Step>("cart")

  // Coupon
  readonly coupon_input = signal<string>("")
  readonly coupon = signal<{ code:string, discount_percent:number }|null>(null)
  readonly coupon_message = signal<{ text:string, tone:"success"|"error" }|null>(null)
  readonly coupon_loading = signal<boolean>(false)

  // Delivery And Payment
  readonly customer = signal<Customer>({ ...EMPTY_CUSTOMER })
  readonly touched = signal<Set<CustomerField>>(new Set())
  readonly submitted = signal<boolean>(false) // Shows All Errors After The First Submit Attempt
  readonly payment_method = signal<PaymentMethod>("card")
  readonly tip_percent = signal<number>(BRAND.checkout.defaultTipPercent)
  readonly submitting = signal<boolean>(false)
  readonly server_error = signal<string|null>(null)

  readonly errors = computed(() => validateCustomer(this.customer()))
  readonly is_form_valid = computed<boolean>(() => Object.keys(this.errors()).length === 0)

  // Tip Is Only Offered For Card Payments, And Only Chosen In The Second Step
  readonly effective_tip = computed<number>(() => this.step() === "details" && this.payment_method() === "card" ? this.tip_percent() : 0)
  readonly totals = computed(() => calculateTotals(this.items(), this.coupon()?.discount_percent ?? 0, this.effective_tip()))

  // Orders Are Accepted Only When Open (Unknown Status Is Left To The Back-End)
  readonly is_closed = computed<boolean>(() => {
    const status = this.status()
    return !!status?.success && !status.is_open
  })

  readonly closed_message = computed<string>(() => {
    const status = this.status()
    if(status?.next_open) return `Momentálne máme zatvorené. Objednávky prijímame od ${status.next_open}.`
    return "Momentálne máme zatvorené. Košík si ponecháme, objednávku dokončíte, keď otvoríme."
  })

  readonly submit_label = computed<string>(() => this.payment_method() === "card" ? "Zaplatiť kartou" : "Objednať na dobierku")

  constructor() {
    // Opens Whenever Another Component Asks For It (e.g. The Header Button)
    this.cartService.open_requests$.pipe(takeUntilDestroyed()).subscribe(() => this.open())

    // Syncs The Native Dialog And The Page Scroll Lock With `is_open`
    effect(() => {
      const is_open:boolean = this.is_open()
      const dialog:HTMLDialogElement = this.dialog().nativeElement

      untracked(() => {
        if(is_open && !dialog.open) dialog.showModal()
        if(!is_open && dialog.open) dialog.close()
        this.document.documentElement.classList.toggle("is-scroll-locked", is_open)
      })
    })

    // Returns To The First Step When The Cart Becomes Empty
    effect(() => {
      if(this.items().length === 0) untracked(() => this.step.set("cart"))
    })

    inject(DestroyRef).onDestroy(() => this.document.documentElement.classList.remove("is-scroll-locked"))
  }

  /******************************************************************************
   Drawer
  ******************************************************************************/

  open():void {
    this.step.set("cart")
    this.server_error.set(null)
    this.customer.set(this.loadCustomer())
    this.is_open.set(true)
  }

  close():void {
    this.is_open.set(false)
  }

  // Closes When Clicking The Backdrop (The Dialog Element Itself, Outside The Panel)
  onDialogClick(event:MouseEvent):void {
    if(event.target === this.dialog().nativeElement) this.close()
  }

  // Escape Key: Goes Back One Step First, Then Closes
  onCancel(event:Event):void {
    event.preventDefault()

    if(this.step() === "details" && !this.submitting()) this.step.set("cart")
    else this.close()
  }

  // Empty Cart: Closes The Drawer And Scrolls To The Menu
  browseMenu():void {
    this.close()
    this.sectionScroll.go(SECTIONS.menu)
  }

  goToDetails():void {
    if(this.items().length === 0) return
    this.server_error.set(null)
    this.step.set("details")
  }

  backToCart():void {
    this.step.set("cart")
  }

  /******************************************************************************
   Cart Lines
  ******************************************************************************/

  changeQuantity(item:CartItem, delta:number):void {
    this.cartService.setQuantity(item.line_key!, item.quantity + delta)
  }

  // Removes A Line And Offers An Undo Inside The Drawer (Toasts Would Be Hidden Behind The Modal Dialog)
  remove(item:CartItem):void {
    const index:number = this.items().indexOf(item)

    this.cartService.remove(item.line_key!)
    this.last_removed.set({ item, index })

    clearTimeout(this.undo_timer)
    this.undo_timer = setTimeout(() => this.last_removed.set(null), 6000)
  }

  undoRemove():void {
    const removed = this.last_removed()
    if(!removed) return

    this.cartService.restoreLine(removed.item, removed.index)
    this.last_removed.set(null)
  }

  optionsLabel(item:CartItem):string {
    return (item.selected_modifiers ?? []).map(modifier => modifier.title).join(", ")
  }

  /******************************************************************************
   Coupon
  ******************************************************************************/

  applyCoupon():void {
    const code:string = this.coupon_input().trim()
    if(!code || this.coupon_loading()) return

    this.coupon_loading.set(true)

    this.cartService.validateCoupon(code).subscribe({
      next:(response) => {
        this.coupon_loading.set(false)

        if(response?.success && response.code && response.discount_percent) {
          this.coupon.set({ code: response.code, discount_percent: response.discount_percent })
          this.coupon_message.set({ text: `Kupón ${response.code} uplatnený (−${response.discount_percent} %).`, tone: "success" })
        }

        else {
          this.coupon.set(null)
          this.coupon_message.set({ text: response?.message || "Kupón nie je platný.", tone: "error" })
        }
      },

      error:(error:HttpErrorResponse) => {
        this.coupon_loading.set(false)
        this.coupon.set(null)
        this.coupon_message.set({ text: error.error?.message || "Kupón sa nepodarilo overiť.", tone: "error" })
      }
    })
  }

  removeCoupon():void {
    this.coupon.set(null)
    this.coupon_input.set("")
    this.coupon_message.set(null)
  }

  /******************************************************************************
   Delivery Form
  ******************************************************************************/

  updateField(field:keyof Customer, value:string):void {
    this.customer.update(customer => ({ ...customer, [field]: field === "message" ? (value || null) : value }))
  }

  touch(field:CustomerField):void {
    this.touched.update(touched => new Set(touched).add(field))
  }

  // Error Shown Under A Field (After It Was Left Or After A Submit Attempt)
  fieldError(field:CustomerField):string|null {
    if(!this.submitted() && !this.touched().has(field)) return null
    return this.errors()[field] ?? null
  }

  /******************************************************************************
   Submit
  ******************************************************************************/

  submit():void {
    if(this.submitting()) return

    this.submitted.set(true)
    this.server_error.set(null)

    if(!this.is_form_valid()) {
      // Moves The Focus To The First Invalid Field
      const first:string = Object.keys(this.errors())[0]
      this.document.getElementById(`checkout-${first}`)?.focus()
      return
    }

    if(this.is_closed()) return

    this.saveCustomer()

    const payload = buildOrderPayload(this.items(), this.trimmedCustomer(), this.coupon()?.code ?? null, this.totals().tip)
    const request = this.payment_method() === "card"
      ? this.paymentService.createCheckoutSession(payload)
      : this.paymentService.createCashOrder(payload)

    this.submitting.set(true)

    request.subscribe({
      next:(response) => {
        if(response?.success && response.url) {
          this.redirect(response.url) // Stripe Checkout Or The Success Page
          return
        }

        this.submitting.set(false)
        this.server_error.set(response?.message || "Objednávku sa nepodarilo odoslať.")
      },

      error:(error:HttpErrorResponse) => {
        this.submitting.set(false)

        const message:string = error.error?.message || (error.status === 0
          ? "Nepodarilo sa spojiť so serverom. Skontrolujte pripojenie a skúste to znova."
          : "Objednávku sa nepodarilo odoslať. Skúste to prosím znova.")

        this.server_error.set(message)
      }
    })
  }

  // Full Page Navigation (Stripe Checkout Is On Another Domain)
  private redirect(url:string):void {
    window.location.href = url
  }

  private trimmedCustomer():Customer {
    const customer:Customer = this.customer()

    return {
      first_name: customer.first_name.trim(),
      last_name: customer.last_name.trim(),
      address: customer.address.trim(),
      city: customer.city.trim(),
      phone_number: customer.phone_number.trim(),
      message: customer.message?.trim() || null
    }
  }

  // Remembers The Delivery Details For The Next Order
  private saveCustomer():void {
    if(typeof window !== "undefined") localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(this.trimmedCustomer()))
  }

  private loadCustomer():Customer {
    if(typeof window === "undefined") return { ...EMPTY_CUSTOMER }

    try {
      const stored = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY) || "null")
      return stored ? { ...EMPTY_CUSTOMER, ...stored } : { ...this.customer() }
    }

    catch {
      return { ...EMPTY_CUSTOMER }
    }
  }
}
