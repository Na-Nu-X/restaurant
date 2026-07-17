import { Component } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { Message } from "../services/message"

export interface ContactMessage {
  first_name:string,
  last_name:string,
  email_address:string,
  message:string
}

@Component({
  selector: 'app-contact-form',
  imports: [FormsModule],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
})
export class ContactForm {
  // Stores The Contact Form Data
  contact_form:ContactMessage = {
    first_name: "",
    last_name: "",
    email_address: "",
    message: ""
  }

  constructor(private MessageService:Message,) {}
  
  // Method For Send The Message
  sendMessage(): void {
    // If The Contact Form Isn't Filled
    if (
      !this.contact_form.first_name.trim() ||
      !this.contact_form.last_name.trim() ||
      !this.contact_form.email_address.trim() ||
      !this.contact_form.message.trim()
    ) {
      alert("Prosím, vyplňte všetky povinné kontaktné údaje pre odoslanie správy.") // Shows The Alert
      return
    }

    // Sends The Message
    this.MessageService.sendMessage(this.contact_form).subscribe({
      next:(response) => {
        if(response && response.success) {
          alert(response.message)

          // Clears The Form
          this.contact_form = { 
            first_name: "", 
            last_name: "", 
            email_address: "",
            message: "" 
          }
        }
        
        else {
          console.error(response.message) // Shows The Error Message
        }
      },

      error:(error) => {
        console.error(error) // Shows The Error
        alert("Pri odosielaní správy došlo k chybe.") // Shows The Alert
      }
    })
  }
}
