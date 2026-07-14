import { Component, signal } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { NavigationBar } from "./navigation-bar/navigation-bar"
import { Banner } from "./banner/banner"
import { SearchBar } from "./search-bar/search-bar"
import { Catalog } from "./catalog/catalog"

@Component({
  selector: "app-root",
  imports: [RouterOutlet, NavigationBar, Banner, SearchBar, Catalog],
  templateUrl: "./app.html",
  styleUrl: "./app.scss"
})

export class App {
  
}
