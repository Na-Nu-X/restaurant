import { Component, OnInit, inject } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { Meta } from "@angular/platform-browser"
import { NavigationBar } from "./navigation-bar/navigation-bar"
import { Footer } from "./footer/footer"
import { CartDrawer } from "./cart-drawer/cart-drawer"
import { ToastHost } from "./shared/toast/toast-host"
import { Loading } from "./services/loading"
import { BRAND } from "./config/brand.config"

@Component({
  selector: "app-root",
  imports: [RouterOutlet, NavigationBar, Footer, CartDrawer, ToastHost],
  templateUrl: "./app.html",
  styleUrl: "./app.scss"
})
export class App implements OnInit {
  readonly is_loading = inject(Loading).is_loading // True While Any HTTP Request Is Pending

  constructor(private meta:Meta) { }

  // Method Which Executes In Beginning
  ngOnInit():void {
    // Sets The SEO Description From The Brand Config (The Page Title Is Set By `BrandTitleStrategy`)
    this.meta.updateTag({ name: "description", content: BRAND.description })
    this.meta.updateTag({ property: "og:title", content: BRAND.name })
    this.meta.updateTag({ property: "og:description", content: BRAND.description })

    console.log("%cWebsite by Patrik Behul - behulpatrik@gmail.com", "color: rgb(170, 255, 50); background-color: rgb(0, 0, 0)") // Secret Message
  }
}
