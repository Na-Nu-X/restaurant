import { Routes } from "@angular/router"
import { Success } from "./success/success"
import { Home } from "./home/home"

export const routes:Routes = [
    { 
        path: "", 
        component: Home
    },

    { 
        path: "success", 
        component: Success 
    }
]