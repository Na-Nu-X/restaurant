import { Component, ElementRef, ViewChild } from "@angular/core"
import { DailyMenu } from "../daily-menu/daily-menu"

@Component({
  selector: "app-banner",
  imports: [DailyMenu],
  templateUrl: "./banner.html",
  styleUrl: "./banner.scss",
})

export class Banner {
  @ViewChild("all_dishes", { static: false }) all_dishes!:ElementRef<HTMLElement> // Gets The All Dishes Section

  scrollTo(selector:string):void {
    if(typeof document !== "undefined") {
      const element:HTMLElement|null = document.querySelector(selector) as HTMLElement || null // Gets The Element

      if(element) {
        const OFFSET:number = 60 + 20 + 45 + 20 // Defines The Offset (Navigation Bar + Padding + Search Bar)
        const element_position:number = element.getBoundingClientRect().top + window.scrollY // Gets The Element's Position

        window.scrollTo({ top: element_position - OFFSET, behavior: "smooth" }) // Starts The Scroll Animation
      }
    }
  }
}