import { Component, inject } from "@angular/core"
import { BRAND, SocialNetwork, PaymentMethod } from "../config/brand.config"
import { OpeningHours } from "../shared/opening-hours/opening-hours"
import { SECTIONS, SectionId, SectionScroll } from "../shared/section-scroll"

// Display Data For Each Supported Social Network (Font Awesome Icon + Label)
const SOCIAL_META:Record<SocialNetwork, { icon:string, label:string }> = {
  instagram: { icon: "fa-brands fa-instagram", label: "Instagram" },
  facebook: { icon: "fa-brands fa-facebook", label: "Facebook" },
  tiktok: { icon: "fa-brands fa-tiktok", label: "TikTok" },
  x: { icon: "fa-brands fa-x-twitter", label: "X" },
  youtube: { icon: "fa-brands fa-youtube", label: "YouTube" }
}

// Display Labels For Each Supported Payment Method
const PAYMENT_LABELS:Record<PaymentMethod, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners_club: "Diners Club",
  jcb: "JCB"
}

@Component({
  selector: "app-footer",
  imports: [OpeningHours],
  templateUrl: "./footer.html",
  styleUrl: "./footer.scss"
})

export class Footer {
  private sectionScroll:SectionScroll = inject(SectionScroll)

  readonly brand = BRAND

  readonly links:{ id:SectionId, label:string }[] = [
    { id: SECTIONS.menu, label: "Menu" },
    { id: SECTIONS.dailyMenu, label: "Denné menu" },
    { id: SECTIONS.contact, label: "Rezervácia a kontakt" }
  ]

  // Method For Scroll To A Home Page Section
  go(id:SectionId, event:Event):void {
    this.sectionScroll.go(id, event)
  }
  readonly year:number = new Date().getFullYear()

  // Social Networks That Have A Link Filled In The Brand Config
  readonly socials = (Object.entries(BRAND.social) as [SocialNetwork, string|undefined][])
    .filter((entry):entry is [SocialNetwork, string] => !!entry[1])
    .map(([network, url]) => ({ url, ...SOCIAL_META[network] }))

  readonly payments = BRAND.paymentMethods.map(method => ({
    src: `images/${method}.png`,
    label: PAYMENT_LABELS[method]
  }))
}
