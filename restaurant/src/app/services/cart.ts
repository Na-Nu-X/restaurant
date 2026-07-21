import { Injectable } from "@angular/core"
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from "@angular/common/http"

export interface modifierGroup {
    id:number,
    title:string,
    is_multiple_choice:boolean,
    is_required:boolean,

    items:{
        id:number,
        title:string,
        extra_price:number
    }[]
}

export interface CartItem {
    id:number,
    title:string,
    description:string,
    price:number,
    quantity:number,
    image:string,

    allergens:{
        number:number,
        name:string
    }[]

    average_rating?:number,
    rating_amount?:number,
    modifier_groups?:modifierGroup[],
    selected_modifiers?:Record<number, any[]>
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
    cart_items$: CartItem[] = this.loadCartFromStorage() // Loads The Cart Items From The Local Storage

    private cart_counter:BehaviorSubject<number> = new BehaviorSubject<number>(this.cart_items$.length) // Updates The Cart Counter
    cart_amount$ = this.cart_counter.asObservable() // Sends The Cart Amount To Other Components

    constructor(private http:HttpClient) {}

    // Method For Add To Cart
    addToCart(dish:CartItem) {
        const selected_modifiers:any[] = Object.values(dish.selected_modifiers || {}).flat() // Gets The Selected Modifiers
        const extra_price:number = selected_modifiers.reduce((sum:number, item:any) => sum + (item.extra_price || 0), 0) // Calculates The Extra Price
      
        // Creates The Copy Of Added Dish With The Extra Price
        const cart_item:CartItem = {
          ...dish,
          price: dish.price + extra_price,
          quantity: 1,
          selected_modifiers: selected_modifiers
        }
      
        this.cart_items$.push(cart_item) // Adds The Dish To The Cart Items
        this.saveCartToStorage() // Updates The Cart Items In The Local Storage
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
        this.cart_counter.next(this.cart_items$.length) // Sends The New Amount Of Cart Items
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
        return this.http.post<ValidateCouponResponse>("http://127.0.0.1:8001/api/validate-coupon/", { code }) // Returns The Data
    }
}