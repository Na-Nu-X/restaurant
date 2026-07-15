import { Component } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { NavigationBar } from "./navigation-bar/navigation-bar"
import { Footer } from "./footer/footer"

@Component({
  selector: "app-root",
  imports: [RouterOutlet, NavigationBar, Footer],
  templateUrl: "./app.html",
  styleUrl: "./app.scss"
})

export class App { }