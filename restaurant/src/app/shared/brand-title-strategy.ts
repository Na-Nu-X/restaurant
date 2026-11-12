import { Injectable, inject } from "@angular/core"
import { Title } from "@angular/platform-browser"
import { RouterStateSnapshot, TitleStrategy } from "@angular/router"
import { BRAND } from "../config/brand.config"

// Page Titles Like "Sledovanie objednávky | Reštaurácia"; Routes Without A Title Show Just The Restaurant Name
@Injectable({ providedIn: "root" })
export class BrandTitleStrategy extends TitleStrategy {
  private title:Title = inject(Title)

  override updateTitle(snapshot:RouterStateSnapshot):void {
    const page:string|undefined = this.buildTitle(snapshot)
    this.title.setTitle(page ? `${page} | ${BRAND.name}` : BRAND.name)
  }
}
