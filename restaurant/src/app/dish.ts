import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"

@Injectable({
  providedIn: "root"
})
export class Dish {
    private api_url:string = "http://127.0.0.1:8001/api/dishes/" // Connection To The Back-End API

    constructor(private http: HttpClient) { }

    // Method For Get Dishes
    getDishes():Observable<any[]> {
        return this.http.get<any[]>(this.api_url) // Returns The Data
    }
}