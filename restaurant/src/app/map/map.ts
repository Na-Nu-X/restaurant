import { Component } from "@angular/core"
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser"
import { BRAND } from "../config/brand.config"

@Component({
  selector: "app-map",
  imports: [],
  templateUrl: "./map.html",
  styleUrl: "./map.scss",
})
export class Map {
  readonly map_url:SafeResourceUrl // Trusted Google Maps Embed URL From The Brand Config
  readonly map_title:string = `Mapa – ${BRAND.address.street}, ${BRAND.address.city}`

  constructor(sanitizer:DomSanitizer) {
    this.map_url = sanitizer.bypassSecurityTrustResourceUrl(BRAND.address.mapEmbedUrl) // The URL Comes From The Developer-Controlled Config, Not From Users
  }
}
