import { Component } from "@angular/core"

import { BRAND } from "../config/brand.config"
import { ContactForm } from "../contact-form/contact-form"
import { Map } from "../map/map"
import { OpeningHours } from "../shared/opening-hours/opening-hours"
import { SECTIONS } from "../shared/section-scroll"

// Reservation & Contact Section: Contact Details, Opening Hours, Message Form And Map
@Component({
  selector: "app-contact-section",
  imports: [ContactForm, Map, OpeningHours],
  templateUrl: "./contact-section.html",
  styleUrl: "./contact-section.scss",
})
export class ContactSection {
  readonly brand = BRAND
  readonly section_id = SECTIONS.contact
}
