import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { BehaviorSubject, Observable } from "rxjs"
import { debounceTime, distinctUntilChanged } from "rxjs/operators"

import type { CartItem } from "./cart"

@Injectable({
  providedIn: "root"
})
export class Dish {
    private api_url:string = "http://127.0.0.1:8001/api/dishes/" // Connection To The Back-End API
    private searched_text = new BehaviorSubject<string>("")

    // Reacts To Searched Text Only After 300MS Of Typing Delay
    searched_text$ = this.searched_text.asObservable().pipe(
      debounceTime(300),
      distinctUntilChanged()
    )

    constructor(private http: HttpClient) { }

    // Method For Get Dishes
    getDishes():Observable<{ 
      success:string,
      message:string,
      dishes:CartItem[]
    }> {
      return this.http.get<{ 
        success:string,
        message:string,
        dishes:CartItem[]
      }>(this.api_url) // Returns The Data
    }

    // Method For Search The Dishes
    searchDish(searched_text:string):void {
      this.searched_text.next(searched_text)
    }
}