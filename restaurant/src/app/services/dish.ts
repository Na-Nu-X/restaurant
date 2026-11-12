import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { apiUrl } from "../config/api"

import type { CartItem } from "./cart"
import type { DailyMenuResponse } from "../daily-menu/daily-menu"

export interface Category {
  id:number,
  name:string,
  icon:string
}

export interface FilterGroup {
  id:number,
  name:string,
  categories:Category[]
}

export interface Meal {
  id:number,
  number:number,
  title:string,
  price:number
}

@Injectable({
  providedIn: "root"
})
export class Dish {
  constructor(private http: HttpClient) { }

  // Method For Get Dish Categories
  getCategories():Observable<{ 
    success:string,
    message:string,
    filter_groups:FilterGroup[]
  }> {
    const api_url:string = apiUrl("get-categories/") // Connection To The Back-End API
    
    // Returns The Data
    return this.http.get<{ 
      success:string,
      message:string,
      filter_groups:FilterGroup[]
    }>(api_url)
  }

  // Method For Get Dishes
  getDishes():Observable<{ 
    success:string,
    message:string,
    dishes:CartItem[]
  }> {
    const api_url:string = apiUrl("dishes/") // Connection To The Back-End API
    
    // Returns The Data
    return this.http.get<{ 
      success:string,
      message:string,
      dishes:CartItem[]
    }>(api_url)
  }

  // Method For Get The Today's Menu
  getTodayMenu():Observable<DailyMenuResponse> {
    const api_url:string = apiUrl("today-menu/") // Connection To The Back-End API
    return this.http.get<DailyMenuResponse>(api_url) // Returns The Data
  }
}