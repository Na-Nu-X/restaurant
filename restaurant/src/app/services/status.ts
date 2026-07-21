import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"

interface StatusResponse {
    success:boolean,
    message:string,
    is_open?:boolean,
    status?:string,
    reason?:string,
    open_till?:string,
    next_open?:string
}

@Injectable({
    providedIn: "root"
})
export class Status {
    private api_url:string = "http://127.0.0.1:8001/api/get-status/" // Connection To The Back-End API

    constructor(private http: HttpClient) { }

    // Method For Send The Message
    getStatus():Observable<StatusResponse> {
        return this.http.get<StatusResponse>(this.api_url) // Returns The Data
    }
}