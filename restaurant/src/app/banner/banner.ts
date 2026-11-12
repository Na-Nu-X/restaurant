import { Component, computed, inject } from "@angular/core"
import { toSignal } from "@angular/core/rxjs-interop"

import { BRAND } from "../config/brand.config"
import { Status } from "../services/status"
import { SECTIONS, SectionId, SectionScroll } from "../shared/section-scroll"
import { StatusBadge } from "../shared/status-badge/status-badge"
import { bindShortWords } from "../shared/typography"

// Hero Section (First Screen Of The Home Page)
@Component({
  selector: "app-banner",
  imports: [StatusBadge],
  templateUrl: "./banner.html",
  styleUrl: "./banner.scss",
})

export class Banner {
  private sectionScroll:SectionScroll = inject(SectionScroll)

  readonly brand = BRAND
  readonly hero = BRAND.hero
  readonly title:string = bindShortWords(BRAND.hero.title)
  readonly subtitle:string = bindShortWords(BRAND.hero.subtitle)
  readonly sections = SECTIONS

  readonly status = toSignal(inject(Status).status$, { initialValue: null }) // Restaurant Open / Closed Status

  // When Closed, The Main Button Invites To Browse Instead Of Promising An Order
  readonly primary_label = computed<string>(() => {
    const s = this.status()
    return s?.success && !s.is_open ? "Pozrieť ponuku" : "Objednať online"
  })

  // Method For Scroll To A Home Page Section
  go(id:SectionId, event:Event):void {
    this.sectionScroll.go(id, event)
  }
}
