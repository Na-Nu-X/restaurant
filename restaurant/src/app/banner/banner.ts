import { Component } from "@angular/core"
import { DailyMenu } from "../daily-menu/daily-menu"
import { Status } from "../services/status"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-banner",
  imports: [DailyMenu, CommonModule],
  templateUrl: "./banner.html",
  styleUrl: "./banner.scss",
})

export class Banner {
  is_open:boolean = true // Stores The Information If Is Open
  status:string = "" // Stores The Status
  reason:string = "" // Stores The Status Reason
  open_till:string = "" // Stores The Open Till Time
  next_open:string = "" // Stores The Next Open Time

  // Method Which Executes In Beginning
  ngOnInit():void {
    // Gets The Current Status
    this.StatusService.getStatus().subscribe({
      next:(response) => {
        if(response && response.success && response.status) {
          this.is_open = response.is_open || false // Sets The Information If Is Open
          this.status = response.status // Sets The Status
          if(response.reason) this.reason = response.reason // Sets The Status Reason
          if(response.open_till) this.open_till = response.open_till // Sets The Open Till Time
          if(response.next_open) this.next_open = response.next_open // Sets The Status Next Open Time
        }
        
        else {
          console.error(response.message) // Shows The Error Message
        }
      },

      error:(error) => {
        console.error(error) // Shows The Error
      }
    })
  }

  constructor(private StatusService:Status) { }

  scrollTo(selector:string):void {
    if(typeof document !== "undefined") {
      const element:HTMLElement|null = document.querySelector(selector) as HTMLElement || null // Gets The Element

      if(element) {
        let offset:number = 60 // Stores The Offset
        
        if(element.classList.contains("all_dishes")) offset = 60 + 20 + 45 + 20 // Sets The Offset (Navigation Bar + Padding + Search Bar)
        if(element.classList.contains("contact_form")) offset = 60 + 20 // Sets The Offset (Navigation Bar + Padding + Search Bar)

        const element_position:number = element.getBoundingClientRect().top + window.scrollY // Gets The Element's Position

        window.scrollTo({ top: element_position - offset, behavior: "smooth" }) // Starts The Scroll Animation
      }
    }
  }
}