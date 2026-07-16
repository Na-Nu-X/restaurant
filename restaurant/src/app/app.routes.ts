import { Routes } from "@angular/router"
import { Success } from "./success/success"
import { Home } from "./home/home"
import { SuccessOrder } from "./success-order/success-order"

export const routes:Routes = [
    { 
        path: "", 
        component: Home
    },

    { 
        path: "success", 
        component: Success 
    },

    { 
        path: "success-order", 
        component: SuccessOrder 
    }
]