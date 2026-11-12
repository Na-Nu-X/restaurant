import { Injectable, computed, inject, signal } from "@angular/core"
import { Observable, Subject } from "rxjs"
import { HttpClient } from "@angular/common/http"
import { apiUrl } from "../config/api"

// One Selectable Option Of A Dish (e.g. "Hranolky", +150 Cents)
export interface ModifierItem {
    id:number,
    title:string,
    extra_price:number // In Cents
}

// Group Of Options Of A Dish (e.g. "Vyberte si prílohu")
export interface ModifierGroup {
    id:number,
    title:string,
    is_multiple_choice:boolean,
    is_required:boolean,
    items:ModifierItem[]
}

/** @deprecated Use `ModifierGroup`. */
export type modifierGroup = ModifierGroup

export interface Allergen {
    number:number,
    name:string
}

// Dish As Returned By The Back-End And Stored In The Cart
export interface CartItem {
    id:number,
    title:string,
    description:string,
    category_id?:number|null,
    price:number, // In Cents. In The Cart It Is The Unit Price Including The Selected Options
    quantity:number,
    image:string,
    allergens:Allergen[],

    average_rating?:number,
    rating_amount?:number,
    modifier_groups?:ModifierGroup[],

    // Cart-Only Fields
    selected_modifiers?:ModifierItem[], // Options Chosen By The Customer
    line_key?:string // Identifies Identical Lines (Same Dish + Same Options) So They Are Merged
}

export const MAX_LINE_QUANTITY:number = 50 // Same Limit As The Back-End

export interface ValidateCouponResponse {
    success:string,
    message:string,
    code?:string,
    discount_percent?:number
}

// Prices Of The Cart After The Coupon And The Tip (All In Cents)
export interface CartTotals {
    subtotal:number,     // Before The Discount
    discount:number,     // Amount Saved By The Coupon
    items_total:number,  // Dishes After The Discount
    tip:number,
    total:number         // Amount To Pay
}

// Discounted Price, Rounded Half Up With Integer Math (Same Formula As The Back-End `applyDiscount`)
export function applyDiscount(price:number, discount_percent:number):number {
    return Math.floor((price * (100 - discount_percent) + 50) / 100)
}

// Calculates The Totals Exactly Like The Back-End Charges Them (Discount Per Unit, Tip From The Discounted Total)
export function calculateTotals(items:CartItem[], discount_percent:number = 0, tip_percent:number = 0):CartTotals {
    const subtotal:number = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const items_total:number = items.reduce((sum, item) => sum + applyDiscount(item.price, discount_percent) * item.quantity, 0)
    const tip:number = Math.round(items_total * tip_percent / 100)

    return { subtotal, discount: subtotal - items_total, items_total, tip, total: items_total + tip }
}

@Injectable({
    providedIn: "root"
})
export class Cart {
    private http:HttpClient = inject(HttpClient)
    private readonly storage_key:string = "cart_items" // Local Storage Key Of The Cart

    readonly items = signal<CartItem[]>(this.loadCartFromStorage()) // Cart Lines
    readonly count = computed<number>(() => this.items().reduce((sum, item) => sum + item.quantity, 0)) // Number Of Items (For The Badge)
    readonly subtotal = computed<number>(() => this.items().reduce((sum, item) => sum + item.price * item.quantity, 0))
    readonly is_empty = computed<boolean>(() => this.items().length === 0)

    private open_requests:Subject<void> = new Subject<void>()
    open_requests$:Observable<void> = this.open_requests.asObservable() // Emits When Any Component Asks To Show The Cart

    // Method For Open The Cart Drawer (It Listens To `open_requests$`)
    openCart():void {
        this.open_requests.next()
    }

    // Method For Add A Dish (With The Chosen Options) To The Cart
    // Identical Lines (Same Dish And Same Options) Are Merged By Increasing The Quantity
    addToCart(dish:CartItem, selected_modifiers:ModifierItem[] = [], quantity:number = 1):void {
        const amount:number = Math.max(1, Math.floor(quantity))
        const extra_price:number = selected_modifiers.reduce((sum, item) => sum + item.extra_price, 0) // Calculates The Extra Price
        const line_key:string = Cart.lineKey(dish.id, selected_modifiers)

        const items:CartItem[] = this.items()

        if(items.some(item => item.line_key === line_key)) {
            this.setItems(items.map(item => item.line_key === line_key ? { ...item, quantity: item.quantity + amount } : item))
            return
        }

        // Stores A Copy Of The Dish Without The Data Only Needed By The Menu
        const { modifier_groups, average_rating, rating_amount, ...dish_data } = dish

        this.setItems([...items, {
            ...dish_data,
            price: dish.price + extra_price,
            quantity: amount,
            selected_modifiers: [...selected_modifiers],
            line_key
        }])
    }

    // Method For Change The Quantity Of A Line (0 Removes It)
    setQuantity(line_key:string, quantity:number):void {
        if(quantity <= 0) {
            this.remove(line_key)
            return
        }

        this.setItems(this.items().map(item => item.line_key === line_key ? { ...item, quantity: Math.min(quantity, MAX_LINE_QUANTITY) } : item))
    }

    // Method For Remove A Line From The Cart
    remove(line_key:string):void {
        this.setItems(this.items().filter(item => item.line_key !== line_key))
    }

    // Method For Put A Removed Line Back As It Was (Undo). Its Price Already Includes The Options
    restoreLine(line:CartItem, index:number = this.items().length):void {
        if(!line.line_key || this.items().some(item => item.line_key === line.line_key)) return

        const items:CartItem[] = [...this.items()]
        items.splice(Math.min(index, items.length), 0, line)
        this.setItems(items)
    }

    // Method For Clear The Whole Cart
    clearCart():void {
        this.setItems([])
    }

    // Builds The Key Of A Cart Line (e.g. "12:3,7")
    static lineKey(dish_id:number, selected_modifiers:ModifierItem[]):string {
        return `${dish_id}:${selected_modifiers.map(item => item.id).sort((a, b) => a - b).join(",")}`
    }

    // Method For Update The Cart And Save It To The Local Storage
    private setItems(items:CartItem[]):void {
        this.items.set(items)

        if(typeof window === "undefined") return

        if(items.length > 0) localStorage.setItem(this.storage_key, JSON.stringify(items))
        else localStorage.removeItem(this.storage_key)
    }

    // Method For Load The Cart From The Local Storage (Also Upgrades Carts Saved By Older Versions)
    private loadCartFromStorage():CartItem[] {
        if(typeof window === "undefined") return []

        try {
            const stored:unknown = JSON.parse(localStorage.getItem(this.storage_key) || "[]")
            if(!Array.isArray(stored)) return []

            return (stored as CartItem[])
                .filter(item => item && typeof item.id === "number" && typeof item.price === "number")
                .map(item => {
                    const selected_modifiers:ModifierItem[] = Array.isArray(item.selected_modifiers) ? item.selected_modifiers : []
                    return { ...item, quantity: Math.max(1, item.quantity || 1), selected_modifiers, line_key: item.line_key ?? Cart.lineKey(item.id, selected_modifiers) }
                })
        }

        catch {
            return [] // Corrupted Storage
        }
    }

    // Method For Validate The Applied Coupon
    validateCoupon(code:string):Observable<ValidateCouponResponse> {
        return this.http.post<ValidateCouponResponse>(apiUrl("validate-coupon/"), { code }) // Returns The Data
    }
}
