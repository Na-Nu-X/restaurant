import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, HostListener, PLATFORM_ID, inject } from "@angular/core"
import { Router, RouterOutlet } from "@angular/router"
import { NavigationBar } from "./navigation-bar/navigation-bar"
import { Footer } from "./footer/footer"
import { Loading } from "./services/loading"
import { isPlatformBrowser } from "@angular/common"

@Component({
  selector: "app-root",
  imports: [RouterOutlet, NavigationBar, Footer],
  templateUrl: "./app.html",
  styleUrl: "./app.scss"
})
export class App implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("background_canvas") background_canvas!:ElementRef<HTMLCanvasElement> // Gets The Background Canvas

  private platform_id:Object = inject(PLATFORM_ID) // Gets The Platform ID
  private is_browser:boolean = isPlatformBrowser(this.platform_id) // Checks If It Is On Browser

  private ctx!:CanvasRenderingContext2D // Stores The Canvas Context
  private readonly CIRCLES_AMOUNT = 10 // Sets The Amount Of Circles
  private readonly COLORS = ["#F0E1AB33", "#FFA60233", "#F3C94033", "#F2BE4233", "#FABD6133"] // Stores The Colors
  private circles:Circle[] = [] // Stores All Circles

  private animation_frame_id!:number // Stores The Animation Frame ID

  is_loading:boolean = false // Stores The Information If The Page Is Loading

  constructor(private LoadingService:Loading) { }

  // Method Which Executes In Beginning
  ngOnInit():void {
    // Initializes The Loader
    this.LoadingService.is_loading$.subscribe((state) => {
      this.is_loading = state
    })

    console.log("%cWebsite by Patrik Behul - behulpatrik@gmail.com", "color: rgb(170, 255, 50); background-color: rgb(0, 0, 0)") // Secret Message
  }

  ngAfterViewInit():void {
    if(!this.is_browser || !this.background_canvas) return

    const canvas:HTMLCanvasElement = this.background_canvas.nativeElement // Gets The Canvas
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D // Gets The Canvas Context
    
    this.handleResizeCanvas() // Resizes The Canvas
    this.generateCircles() // Generates The Circles
    this.initializeMainLoop() // Initializes The Main Loop
  }

  ngOnDestroy():void {
    if(this.is_browser && this.animation_frame_id) {
      cancelAnimationFrame(this.animation_frame_id) // Removes The Animation
    }
  }

  @HostListener("window:resize")
  onResize():void {
    if(!this.is_browser || !this.background_canvas) return

    this.handleResizeCanvas() // Resizes The Canvas
    this.circles = [] // Deletes The Previous Circles
    this.generateCircles() // Generates The Circles
  }

  // Method For Handle Resize Of Canvas
  private handleResizeCanvas():void {
    const canvas:HTMLCanvasElement = this.background_canvas.nativeElement // Gets The Canvas

    canvas.width = window.innerWidth // Sets The Width Of The Background Canvas
    canvas.height = window.innerHeight // Sets The Height Of The Background Canvas

    this.ctx.clearRect(0, 0, canvas.width, canvas.height) // Clears The Canvas
  }

  // Method For Generate The Circles
  private generateCircles():void {
    const canvas:HTMLCanvasElement = this.background_canvas.nativeElement // Gets The Canvas

    for(let i:number = 0; i < this.CIRCLES_AMOUNT; i++) {
      this.circles.push(new Circle(canvas.width, canvas.height, this.COLORS)) // Pushes The Circle To The Array Of All Circles
    }
  }

  // Method For Initialize The Main Loop
  private initializeMainLoop = (): void => {
    const canvas:HTMLCanvasElement = this.background_canvas.nativeElement // Gets The Canvas

    this.ctx.clearRect(0, 0, canvas.width, canvas.height) // Clears The Canvas
    
    for(const circle of this.circles) {
      circle.generate(this.ctx) // Generates The Circle
      circle.animate(canvas.width, canvas.height) // Animates The Circle
    }
    
    this.animation_frame_id = requestAnimationFrame(this.initializeMainLoop) // Loops The Animation
  }
}

// Function For Generate Range Of Numbers
function generateNumberRange(from:number, to:number):number {
  return Math.random() * (to - from) + from
}

// Defines The Circle Class
class Circle {
  #radius:number
  #x:number
  #y:number
  #dx:number
  #dy:number
  #color:string

  constructor(canvas_width:number, canvas_height:number, colors:string[]) {
    this.#radius = Math.floor(generateNumberRange(5, 10)) // Generates Random Radius Of The Circle Between 5 And 10
    this.#x = Math.floor(generateNumberRange(this.#radius * 2, canvas_width - this.#radius * 2)) // Generates Random Position On The Canvas
    this.#y = Math.floor(generateNumberRange(this.#radius * 2, canvas_height - this.#radius * 2)) // Generates Random Position On The Canvas
    this.#dx = generateNumberRange(-0.1, 0.1) // Sets Random Float Number Of Speed Between -0.1 And 0.1
    this.#dy = generateNumberRange(-0.1, 0.1) // Sets Random Float Number Of Speed Between -0.1 And 0.1
    this.#color = colors[Math.floor(generateNumberRange(0, colors.length - 1))] || "black" // Sets The Random Color
  }

  // Generates The Circle
  generate(ctx:CanvasRenderingContext2D):void {
    ctx.fillStyle = this.#color
    ctx.beginPath()
    ctx.arc(this.#x, this.#y, this.#radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Animates The Circle
  animate(canvas_width:number, canvas_height:number):void {
    this.#x += this.#dx
    this.#y += this.#dy

    // Reverses The Direction On The X Axis When Hits One Of The X Borders
    if(this.#x >= canvas_width - this.#radius || this.#x <= this.#radius) {
      this.#dx = -this.#dx
    }

    // Reverses The Direction On The Y Axis When Hits One Of The Y Borders
    if(this.#y >= canvas_height - this.#radius || this.#y <= this.#radius) {
      this.#dy = -this.#dy
    }
  }
}