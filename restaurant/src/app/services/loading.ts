import { Injectable } from "@angular/core"
import { BehaviorSubject } from "rxjs"

@Injectable({
  providedIn: "root",
})
export class Loading {
  private loading_subject:BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)
  is_loading$ = this.loading_subject.asObservable() // Stores The Information If The Page Is Loading

  // Method For Show The Loader
  show() {
    this.loading_subject.next(true)
  }

  // Method For Hide The Loader
  hide() {
    this.loading_subject.next(false)
  }
}