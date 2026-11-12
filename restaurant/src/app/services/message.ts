import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { apiUrl } from "../config/api"

import type { ContactMessage } from "../contact-form/contact-form"

@Injectable({
  providedIn: "root"
})
export class Message {
    private api_url:string = apiUrl("contact/") // Connection To The Back-End API

    constructor(private http: HttpClient) { }

    // Method For Send The Message
    sendMessage(contact_form:ContactMessage):Observable<{ 
      success:string,
      message:string
    }> {
      return this.http.post<{ 
        success:string,
        message:string
      }>(this.api_url, contact_form) // Returns The Data
    }
}