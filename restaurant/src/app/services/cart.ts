import { Injectable } from "@angular/core"
import { BehaviorSubject, Observable, Subject } from "rxjs"
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

export interface ValidateCouponResponse {
    success:string,
    message:string,
    code?:string,
    discount_percent?:number
}

@Injectable({
    providedIn: "root"
})
export class Cart {
    private storage_key:string = "cart_items" // Sets The Local Storage Key For Stored Cart Items
    cart_items$:CartItem[] = this.loadCartFromStorage() // Loads The Cart Items From The Local Storage

    private cart_counter:BehaviorSubject<number> = new BehaviorSubject<number>(this.countItems()) // Updates The Cart Counter
    cart_amount$ = this.cart_counter.asObservable() // Sends The Cart Amount (Sum Of Quantities) To Other Components

    private open_requests:Subject<void> = new Subject<void>()
    open_requests$:Observable<void> = this.open_requests.asObservable() // Emits When Any Component Asks To Show The Cart

    // Method For Open The Cart (The Cart Modal Listens To `open_requests$`)
    openCart():void {
        this.open_requests.next()
    }

    // Method For Count All Items In The Cart (Respects Quantities)
    private countItems():number {
        return this.cart_items$.reduce((sum, one_item) => sum + (one_item.quantity || 1), 0)
    }

    constructor(private http:HttpClient) {}

    // Method For Add A Dish (With The Chosen Options) To The Cart
    // Identical Lines (Same Dish And Same Options) Are Merged By Increasing The Quantity
    addToCart(dish:CartItem, selected_modifiers:ModifierItem[] = [], quantity:number = 1):void {
        const amount:number = Math.max(1, Math.floor(quantity))
        const extra_price:number = selected_modifiers.reduce((sum, item) => sum + item.extra_price, 0) // Calculates The Extra Price
        const line_key:string = Cart.lineKey(dish.id, selected_modifiers)

        const existing:CartItem|undefined = this.cart_items$.find(item => (item.line_key ?? Cart.lineKey(item.id, item.selected_modifiers ?? [])) === line_key)

        if(existing) {
            existing.quantity = (existing.quantity || 1) + amount
        }

        else {
            // Stores A Copy Of The Dish Without The Data Only Needed By The Menu
            const { modifier_groups, average_rating, rating_amount, ...dish_data } = dish

            this.cart_items$.push({
                ...dish_data,
                price: dish.price + extra_price,
                quantity: amount,
                selected_modifiers: [...selected_modifiers],
                line_key
            })
        }

        this.saveCartToStorage() // Updates The Cart Items In The Local Storage
    }

    // Builds The Key Of A Cart Line (e.g. "12:3,7")
    static lineKey(dish_id:number, selected_modifiers:ModifierItem[]):string {
        return `${dish_id}:${selected_modifiers.map(item => item.id).sort((a, b) => a - b).join(",")}`
    }

    // Method For Remove The Item From Cart
    removeFromCart(index:number) {
        if(index > -1 && index < this.cart_items$.length) {
            this.cart_items$.splice(index, 1) // Removes The Item From Cart
            this.saveCartToStorage() // Updates The Cart Items In The Local Storage
        }
    }

    // Method For Clear The Whole Cart
    clearCart():void {
        this.cart_items$ = [] // Deletes All Items From The Cart Items
        if(typeof window !== "undefined") localStorage.removeItem(this.storage_key) // Deletes The Stored Cart Items In The Local Storage
        this.cart_counter.next(0) // Sends The New Amount Of Cart Items
    }

    // Method For Save The Cart Items To The Local Storage
    private saveCartToStorage():void {
        if(typeof window !== "undefined") localStorage.setItem(this.storage_key, JSON.stringify(this.cart_items$)) // Saves The Cart Items To The Local Storage
        this.cart_counter.next(this.countItems()) // Sends The New Amount Of Cart Items
    }

    // Method For Load The Cart Items From The Local Storage
    private loadCartFromStorage():CartItem[] {
        if(typeof window !== "undefined") {
            const stored_cart_items:string|null = localStorage.getItem(this.storage_key) || null // Gets The Stored Cart Items
            return stored_cart_items ? JSON.parse(stored_cart_items) : [] // Returns The Cart Items If There Are Any
        }

        return [] // Returns An Empty Array
    }

    // Method For Validate The Applied Coupon
    validateCoupon(code:string):Observable<ValidateCouponResponse> {
        return this.http.post<ValidateCouponResponse>(apiUrl("validate-coupon/"), { code }) // Returns The Data
    }
}