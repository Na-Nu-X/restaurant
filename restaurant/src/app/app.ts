import { Component, OnInit } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { Meta, Title } from "@angular/platform-browser"
import { NavigationBar } from "./navigation-bar/navigation-bar"
import { Footer } from "./footer/footer"
import { CartModal } from "./cart-modal/cart-modal"
import { ToastHost } from "./shared/toast/toast-host"
import { Loading } from "./services/loading"
import { BRAND } from "./config/brand.config"

@Component({
  selector: "app-root",
  imports: [RouterOutlet, NavigationBar, Footer, CartModal, ToastHost],
  templateUrl: "./app.html",
  styleUrl: "./app.scss"
})
export class App implements OnInit {
  is_loading:boolean = false // Stores The Information If The Page Is Loading

  constructor(
    private LoadingService:Loading,
    private title:Title,
    private meta:Meta
  ) { }

  // Method Which Executes In Beginning
  ngOnInit():void {
    // Sets The Page Title And SEO Description From The Brand Config
    this.title.setTitle(BRAND.name)
    this.meta.updateTag({ name: "description", content: BRAND.description })
    this.meta.updateTag({ property: "og:title", content: BRAND.name })
    this.meta.updateTag({ property: "og:description", content: BRAND.description })

    // Initializes The Loader
    this.LoadingService.is_loading$.subscribe((state) => {
      this.is_loading = state
    })

    console.log("%cWebsite by Patrik Behul - behulpatrik@gmail.com", "color: rgb(170, 255, 50); background-color: rgb(0, 0, 0)") // Secret Message
  }
}
