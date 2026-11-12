import {
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild
} from "@angular/core"

import { DecimalPipe } from "@angular/common"

import { BRAND } from "../config/brand.config"
import { PricePipe } from "../shared/price.pipe"
import type { CartItem, ModifierGroup, ModifierItem } from "../services/cart"

export interface DishSelection {
  dish:CartItem,
  modifiers:ModifierItem[],
  quantity:number
}

const MAX_QUANTITY:number = 20

// Detail Panel Of One Dish: Photo, Description, Allergens, Options, Quantity, "Add To Cart"
// Bottom Sheet On Phones, Centered Dialog From 768px Up
@Component({
  selector: "app-dish-detail",
  imports: [PricePipe, DecimalPipe],
  templateUrl: "./dish-detail.html",
  styleUrl: "./dish-detail.scss",
})
export class DishDetail {
  private document:Document = inject(DOCUMENT)
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>("dialog")

  readonly dish = input<CartItem|null>(null) // Dish To Show (null = Closed)

  readonly closed = output<void>()
  readonly confirmed = output<DishSelection>()

  readonly locale:string = BRAND.locale
  readonly max_quantity:number = MAX_QUANTITY

  readonly selections = signal<Record<number, number[]>>({}) // Selected Option IDs Per Group ID
  readonly quantity = signal<number>(1)
  readonly show_errors = signal<boolean>(false) // Highlights Missing Required Groups After An Add Attempt

  readonly groups = computed<ModifierGroup[]>(() => this.dish()?.modifier_groups ?? [])

  // All Selected Options In The Order Of The Groups
  readonly selected_items = computed<ModifierItem[]>(() => {
    const selections = this.selections()
    return this.groups().flatMap(group => group.items.filter(item => selections[group.id]?.includes(item.id)))
  })

  readonly unit_price = computed<number>(() => (this.dish()?.price ?? 0) + this.selected_items().reduce((sum, item) => sum + item.extra_price, 0))
  readonly total_price = computed<number>(() => this.unit_price() * this.quantity())

  // Required Groups Without Any Selection
  readonly missing_groups = computed<ModifierGroup[]>(() => {
    const selections = this.selections()
    return this.groups().filter(group => group.is_required && !(selections[group.id]?.length))
  })

  constructor() {
    // Opens / Closes The Native Dialog When The Input Changes And Resets The Form For Every Dish
    effect(() => {
      const dish = this.dish()
      const dialog:HTMLDialogElement = this.dialog().nativeElement

      untracked(() => {
        if(dish) {
          this.selections.set({})
          this.quantity.set(1)
          this.show_errors.set(false)

          if(!dialog.open) dialog.showModal() // The Panel Content Is Re-Created For Every Dish, So It Always Starts At The Top
        }

        else if(dialog.open) {
          dialog.close()
        }

        this.document.documentElement.classList.toggle("is-scroll-locked", !!dish)
      })
    })

    inject(DestroyRef).onDestroy(() => this.document.documentElement.classList.remove("is-scroll-locked"))
  }

  // Method For Check If An Option Is Selected
  isSelected(group:ModifierGroup, item:ModifierItem):boolean {
    return this.selections()[group.id]?.includes(item.id) ?? false
  }

  // Method For Select / Unselect An Option
  // Single Choice: Picks The Option (An Optional Group Can Be Cleared By Picking The Same Option Again)
  // Multiple Choice: Toggles The Option
  toggle(group:ModifierGroup, item:ModifierItem):void {
    this.selections.update(selections => {
      const current:number[] = selections[group.id] ?? []
      let next:number[]

      if(group.is_multiple_choice) {
        next = current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]
      }

      else {
        next = current.includes(item.id) && !group.is_required ? [] : [item.id]
      }

      return { ...selections, [group.id]: next }
    })
  }

  // Method For Check If A Group Should Show Its "Required" Error
  isMissing(group:ModifierGroup):boolean {
    return this.show_errors() && this.missing_groups().some(missing => missing.id === group.id)
  }

  // Method For Change The Quantity
  changeQuantity(delta:number):void {
    this.quantity.update(quantity => Math.min(MAX_QUANTITY, Math.max(1, quantity + delta)))
  }

  // Method For Add The Dish With The Chosen Options To The Cart
  confirm():void {
    const dish = this.dish()
    if(!dish) return

    const missing:ModifierGroup[] = this.missing_groups()

    if(missing.length > 0) {
      this.show_errors.set(true)

      // Scrolls To The First Group That Still Needs A Choice
      this.document.getElementById(this.groupId(missing[0]))?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    this.confirmed.emit({ dish, modifiers: this.selected_items(), quantity: this.quantity() })
  }

  // Method For Close The Panel (Close Button, Backdrop Click, Escape Key)
  close():void {
    this.closed.emit()
  }

  // Closes The Dialog When Clicking The Backdrop (The Dialog Element Itself, Outside The Panel)
  onDialogClick(event:MouseEvent):void {
    if(event.target === this.dialog().nativeElement) this.close()
  }

  // Native "cancel" Event (Escape Key): Let The Parent Close It So The State Stays In Sync
  onCancel(event:Event):void {
    event.preventDefault()
    this.close()
  }

  // Method For Get The DOM ID Of A Group (For Labels And Scrolling)
  groupId(group:ModifierGroup):string {
    return `modifier-group-${group.id}`
  }

  // Method For Describe The Rules Of A Group (e.g. "Povinné · vyberte 1")
  groupHint(group:ModifierGroup):string {
    const rule:string = group.is_multiple_choice ? "vyberte ľubovoľne" : "vyberte 1"
    return group.is_required ? `Povinné · ${rule}` : `Voliteľné · ${rule}`
  }
}
