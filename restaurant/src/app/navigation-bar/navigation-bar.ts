import { 
  Component, 
  HostListener, 
  afterNextRender, 
  ViewChild, 
  ElementRef 
} from "@angular/core"

@Component({
  selector: "app-navigation-bar",
  imports: [],
  templateUrl: "./navigation-bar.html",
  styleUrl: "./navigation-bar.scss",
})

export class NavigationBar {
  is_open:boolean = false // Stores The Information If The Menu Is Open
  is_scrolled:boolean = false  // Stores The Information If The Page Is Scrolled

  constructor() {
    afterNextRender(() => {
      this.checkWindowWidth(window.innerWidth)
      this.onWindowScroll()
    })
  }

  // Method For Toggle The Menu
  toggleMenu():void {
    this.is_open = !this.is_open // Shows / Hides The Menu
  }

  // Window Scroll Functionality
  @HostListener("window:scroll", [])
  onWindowScroll():void {
    if(typeof window !== "undefined") {
      this.is_scrolled = window.scrollY > 50 // Updates The Information If The Page Is Scrolled
    }
  }

  // Window Resize Functionality
  @HostListener("window:resize", ["$event"])
  onResize(event:any):void {
    this.checkWindowWidth(event.target.innerWidth)
  }

  // Method For Check The Window Width
  private checkWindowWidth(width:number):void {
    if(width > 600) {
      this.is_open = false // Hides The Menu
    }
  }

  @ViewChild("all_dishes", { static: false }) all_dishes!:ElementRef<HTMLElement> // Gets The All Dishes Section

  scrollTo(selector:string):void {
    if(typeof document !== "undefined") {
      const element:HTMLElement|null = document.querySelector(selector) as HTMLElement || null // Gets The Element

      if(element) {
        const OFFSET:number = 60 + 20 // Defines The Offset (Navigation Bar + Padding)
        const element_position:number = element.getBoundingClientRect().top + window.scrollY // Gets The Element's Position

        window.scrollTo({ top: element_position - OFFSET, behavior: "smooth" }) // Starts The Scroll Animation
      }
    }
  }
}