import { ApplicationRef, Injectable, inject, DOCUMENT } from "@angular/core"
import { Router } from "@angular/router"

// Home Page Section IDs (Used By The Header, Hero And Footer Links)
export const SECTIONS = {
  menu: "menu",
  dailyMenu: "denne-menu",
  contact: "kontakt"
} as const

export type SectionId = typeof SECTIONS[keyof typeof SECTIONS]

@Injectable({ providedIn: "root" })
export class SectionScroll {
  private router:Router = inject(Router)
  private document:Document = inject(DOCUMENT)
  private app_ref:ApplicationRef = inject(ApplicationRef)

  // Smooth-Scrolls To A Home Page Section, Or Navigates To The Home Page First When On Another Page
  // The Offset For The Fixed Header Comes From `scroll-padding-top` In styles.scss
  go(id:SectionId, event?:Event):void {
    event?.preventDefault()

    const element:HTMLElement|null = this.document.getElementById(id)

    if(element) {
      element.scrollIntoView({ block: "start" }) // Follows The CSS `scroll-behavior` (Smooth, Unless Reduced Motion Is Preferred)
      return
    }

    this.router.navigate(["/"], { fragment: id })
  }

  // Scrolls To The Section From The URL Fragment (e.g. "/#menu") After The Home Page Renders
  // Waits Until All Pending HTTP Requests Finish, Because The Content Loaded Above The Section Moves It Down
  scrollToFragment(fragment:string|null):void {
    if(!fragment) return

    this.app_ref.whenStable().then(() => {
      requestAnimationFrame(() => this.document.getElementById(fragment)?.scrollIntoView({ block: "start" }))
    })
  }
}
