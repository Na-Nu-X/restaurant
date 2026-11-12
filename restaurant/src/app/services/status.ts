import { Injectable, inject } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable, catchError, of, shareReplay } from "rxjs"
import { apiUrl } from "../config/api"

export interface StatusResponse {
    success:boolean,
    message:string,
    is_open?:boolean,
    status?:string,
    reason?:string|null,
    open_till?:string,
    next_open?:string
}

@Injectable({
    providedIn: "root"
})
export class Status {
    private http:HttpClient = inject(HttpClient)
    private api_url:string = apiUrl("get-status/") // Connection To The Back-End API

    // Restaurant Status, Fetched Once And Shared By All Components (Header, Hero, Cart)
    readonly status$:Observable<StatusResponse> = this.http.get<StatusResponse>(this.api_url).pipe(
        catchError((error) => {
            console.error(error) // Shows The Error
            return of<StatusResponse>({ success: false, message: "Stav podniku sa nepodarilo načítať." })
        }),
        shareReplay({ bufferSize: 1, refCount: false })
    )

    // Method For Get The Restaurant Status
    getStatus():Observable<StatusResponse> {
        return this.status$ // Returns The Shared Data
    }
}
