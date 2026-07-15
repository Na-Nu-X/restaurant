import { Injectable } from "@angular/core"
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
    id:number,
    title:string,
    description:string,
    price:number,
    image:string
}

@Injectable({
    providedIn: "root"
})
export class Cart {
    private cart_counter:BehaviorSubject<number> = new BehaviorSubject<number>(0) // Updates The Cart Counter
    
    cart_items$:CartItem[] = [] // Stores The Cart Items
    cart_amount$ = this.cart_counter.asObservable() // Sends The Cart Amount To Other Components

    constructor() { }

    // Method For Add To Cart
    addToCart(dish:CartItem) {
        this.cart_items$.push(dish) // Adds The Dish To The Cart Items
        this.cart_counter.next(this.cart_items$.length) // Sends The New Amount Of Cart Items
    }

    // Method For Remove The Item From Cart
    removeFromCart(index: number) {
        if(index > -1 && index < this.cart_items$.length) {
            this.cart_items$.splice(index, 1) // Removes The Item From Cart
            this.cart_counter.next(this.cart_items$.length) // Sends The New Amount Of Cart Items
        }
    }
}