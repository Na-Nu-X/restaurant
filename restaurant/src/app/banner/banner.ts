import { Component, ElementRef, ViewChild } from "@angular/core"
import { DailyMenu } from "../daily-menu/daily-menu"

@Component({
  selector: "app-banner",
  imports: [DailyMenu],
  templateUrl: "./banner.html",
  styleUrl: "./banner.scss",
})

export class Banner {
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