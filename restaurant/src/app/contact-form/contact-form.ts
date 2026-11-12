import { Component, computed, inject, signal } from "@angular/core"
import { HttpErrorResponse } from "@angular/common/http"
import { FormsModule } from "@angular/forms"

import { Message } from "../services/message"
import { Toast } from "../shared/toast/toast.service"

export interface ContactMessage {
  first_name:string,
  last_name:string,
  email_address:string,
  message:string
}

type ContactField = keyof ContactMessage

const EMAIL_PATTERN:RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validates The Contact Form. Returns The Error Message Of Every Invalid Field
export function validateContact(form:ContactMessage):Partial<Record<ContactField, string>> {
  const errors:Partial<Record<ContactField, string>> = {}

  if(!form.first_name.trim()) errors.first_name = "Zadajte meno."
  if(!form.last_name.trim()) errors.last_name = "Zadajte priezvisko."

  if(!form.email_address.trim()) errors.email_address = "Zadajte e-mail."
  else if(!EMAIL_PATTERN.test(form.email_address.trim())) errors.email_address = "Zadajte platný e-mail."

  if(!form.message.trim()) errors.message = "Napíšte nám správu."

  return errors
}

const EMPTY_FORM:ContactMessage = { first_name: "", last_name: "", email_address: "", message: "" }

@Component({
  selector: "app-contact-form",
  imports: [FormsModule],
  templateUrl: "./contact-form.html",
  styleUrl: "./contact-form.scss",
})
export class ContactForm {
  private messageService:Message = inject(Message)
  private toast:Toast = inject(Toast)

  // Stores The Contact Form Data
  contact_form:ContactMessage = { ...EMPTY_FORM }

  readonly submitted = signal<boolean>(false) // Shows The Field Errors After The First Submit Attempt
  readonly sending = signal<boolean>(false)
  readonly errors = signal<Partial<Record<ContactField, string>>>({})
  readonly status = signal<{ tone:"success"|"error", text:string }|null>(null)
  readonly has_errors = computed<boolean>(() => Object.keys(this.errors()).length > 0)

  // Re-Validates While Typing (Only After The First Submit Attempt)
  onInput():void {
    if(this.submitted()) this.errors.set(validateContact(this.contact_form))
  }

  // Method For Send The Message
  sendMessage():void {
    if(this.sending()) return

    this.submitted.set(true)
    this.status.set(null)
    this.errors.set(validateContact(this.contact_form))

    if(this.has_errors()) return

    this.sending.set(true)

    this.messageService.sendMessage(this.contact_form).subscribe({
      next:(response) => {
        this.sending.set(false)

        if(response?.success) {
          this.contact_form = { ...EMPTY_FORM } // Clears The Form
          this.submitted.set(false)
          this.status.set({ tone: "success", text: "Ďakujeme, správu sme dostali. Ozveme sa vám čo najskôr." })
          this.toast.success("Správa bola odoslaná.")
        }

        else {
          this.status.set({ tone: "error", text: response?.message || "Správu sa nepodarilo odoslať." })
        }
      },

      error:(error:HttpErrorResponse) => {
        console.error(error) // Shows The Error
        this.sending.set(false)
        this.status.set({ tone: "error", text: error.error?.message || "Pri odosielaní správy došlo k chybe. Skúste to prosím znova." })
      }
    })
  }
}
