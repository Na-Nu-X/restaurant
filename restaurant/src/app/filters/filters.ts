import { CommonModule } from "@angular/common"
import { Component, EventEmitter, Output } from "@angular/core"
import { Dish } from "../services/dish"

import type { FilterGroup, Category } from "../services/dish"

@Component({
  selector: "app-filters",
  imports: [CommonModule],
  templateUrl: "./filters.html",
  styleUrl: "./filters.scss",
})
export class Filters {
  @Output() listenToCategory = new EventEmitter<{ [group_id:number]:number|null }>()

  filter_groups:FilterGroup[] = [] // Stores All Filter Groups
  selected_filters:{ [group_id: number]:{ id:number; name:string }|null } = {} // Gets Every Category Of Filters
  open_group_id:number|null = null // Stores The Group ID Of Currently Opened Select Menu

  constructor(private dishService:Dish) { }

  // Method Which Executes In Beginning
  ngOnInit():void {
    this.dishService.getCategories().subscribe({
      next:(response) => {
        if(response && response.success) {
          this.filter_groups = response.filter_groups // Sets The Filter Groups
        }
        
        else {
          console.error(response.message) // Shows The Error Message
        }
      },

      error:(error) => {
        console.error(error) // Shows The Error
      }
    })
  }
  
  // Method For Toggle Show / Hide Select Menu
  toggleShowSelectMenu(group_id:number):void {
    this.open_group_id = this.open_group_id === group_id ? null : group_id
  }

  // Method For Select The Category
  selectCategory(group_id:number, category:Category):void {
    this.selected_filters[group_id] = { id: category.id, name: category.name } // Sets The Selected Filters
    this.open_group_id = null // Closes The Select Menu
    this.emitFilters() // Sends All Active Filters To The Parent
  }

  // Method For Reset The Group Select Menu
  resetGroupFilter(group_id:number):void {
    this.selected_filters[group_id] = null // Sets The Selected Filters
    this.open_group_id = null // Closes The Select Menu
    this.emitFilters() // Sends All Active Filters To The Parent
  }

  // Method For Get The Filter Group Label
  getGroupLabel(group:FilterGroup):string {
    const selected = this.selected_filters[group.id] // Gets The Selected Filter
    return selected ? selected.name : group.name // Returns The Filter Group Name
  }

  // Method For Send All Active Filters To The Parent
  emitFilters():void {
    const active_filters: { [group_id:number]:number|null } = {} // Gets The Active Filters

    for(const group_id in this.selected_filters) {
      active_filters[group_id] = this.selected_filters[group_id]?.id ?? null
    }
    
    this.listenToCategory.emit(active_filters) // Triggers The Category Change
  }
}