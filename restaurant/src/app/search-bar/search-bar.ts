import { 
  Component, 
  ViewChild, 
  ElementRef
} from "@angular/core"

import { Dish } from "../services/dish"

@Component({
  selector: "app-search-bar",
  imports: [],
  templateUrl: "./search-bar.html",
  styleUrl: "./search-bar.scss",
})

export class SearchBar {
  constructor(private dishService:Dish) { }

  @ViewChild("search_bar", { static: false }) search_bar!:ElementRef<HTMLInputElement> // Gets The Search Bar

  // Method For Search The Dishes
  searchDish(searched_text:string):void {
    this.dishService.searchDish(searched_text) // Searches The Dishes
  }

  // Method For Delete The Search
  deleteSearch():void {
    this.search_bar.nativeElement.value = "" // Deletes The Searched Text
    this.dishService.searchDish("") // Shows All Dishes
  }
}