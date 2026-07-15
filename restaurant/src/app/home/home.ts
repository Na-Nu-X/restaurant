import { Component } from "@angular/core"
import { Banner } from "../banner/banner"
import { SearchBar } from "../search-bar/search-bar"
import { Catalog } from "../catalog/catalog"
import { ContactForm } from "../contact-form/contact-form"

@Component({
  selector: "app-home",
  imports: [
    Banner,
    SearchBar,
    Catalog,
    ContactForm
  ],
  templateUrl: "./home.html",
  styleUrl: "./home.scss"
})
export class Home {}