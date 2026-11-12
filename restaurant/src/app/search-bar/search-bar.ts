import { Component, ElementRef, input, model, viewChild } from "@angular/core"

// Reusable Search Field With A Clear Button (Two-Way Bound: [(value)])
@Component({
  selector: "app-search-bar",
  templateUrl: "./search-bar.html",
  styleUrl: "./search-bar.scss",
})
export class SearchBar {
  readonly value = model<string>("") // Current Search Text
  readonly placeholder = input<string>("Hľadať...")
  readonly label = input<string>("Vyhľadávanie")

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>("field")

  // Method For Delete The Search And Keep Typing
  clear():void {
    this.value.set("")
    this.field().nativeElement.focus()
  }
}
