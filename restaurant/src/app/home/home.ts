import { Component } from "@angular/core"
import { Banner } from "../banner/banner"
import { SearchBar } from "../search-bar/search-bar"
import { Catalog } from "../catalog/catalog"
import { ContactForm } from "../contact-form/contact-form"
import { Map } from "../map/map"

@Component({
  selector: "app-home",
  imports: [
    Banner,
    SearchBar,
    Catalog,
    ContactForm,
    Map
  ],
  templateUrl: "./home.html",
  styleUrl: "./home.scss"
})
export class Home {}