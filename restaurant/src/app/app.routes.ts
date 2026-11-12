import { Routes } from "@angular/router"
import { Home } from "./home/home"
import { OrderConfirmation } from "./order-confirmation/order-confirmation"
import { TrackOrder } from "./track-order/track-order"

export const routes:Routes = [
    { 
        path: "", 
        component: Home
    },

    // Thank-You Pages (The Back-End Redirects Here: Stripe → "success", Cash On Delivery → "success-order")
    { 
        path: "success", 
        component: OrderConfirmation,
        data: { kind: "card" },
        title: "Platba prebehla úspešne"
    },

    { 
        path: "success-order", 
        component: OrderConfirmation,
        data: { kind: "cash" },
        title: "Objednávka je prijatá"
    },

    { 
        path: "objednavka/:tracking_code", 
        component: TrackOrder,
        title: "Sledovanie objednávky"
    }
]
