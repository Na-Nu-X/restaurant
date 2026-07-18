import { Component } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { NavigationBar } from "./navigation-bar/navigation-bar"
import { Footer } from "./footer/footer"
import { Router } from '@angular/router'
import { Loading } from "./services/loading"

@Component({
  selector: "app-root",
  imports: [RouterOutlet, NavigationBar, Footer],
  templateUrl: "./app.html",
  styleUrl: "./app.scss"
})
export class App {
  is_loading:boolean = false // Stores The Information If The Page Is Loading

  constructor(private router:Router, private LoadingService:Loading) { }

  // Method Which Executes In Beginning
  ngOnInit():void {
    // Initializes The Loader
    this.LoadingService.is_loading$.subscribe((state) => {
      this.is_loading = state
    })

    console.log("%cWebsite by Patrik Behul - behulpatrik@gmail.com", "color: rgb(170, 255, 50); background-color: rgb(0, 0, 0)") // Secret Message
  }
}