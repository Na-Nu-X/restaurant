import { Component, signal } from "@angular/core"
import { RouterOutlet } from "@angular/router"
import { NavigationBar } from "./navigation-bar/navigation-bar"
import { Banner } from "./banner/banner"
import { SearchBar } from "./search-bar/search-bar"
import { Catalog } from "./catalog/catalog"
import { Footer } from "./footer/footer"

@Component({
  selector: "app-root",
  imports: [RouterOutlet, NavigationBar, Banner, SearchBar, Catalog, Footer],
  templateUrl: "./app.html",
  styleUrl: "./app.scss"
})

export class App {
  
}
