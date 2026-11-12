import {
  Component,
  DestroyRef,
  DOCUMENT,
  HostListener,
  afterNextRender,
  effect,
  inject,
  signal
} from "@angular/core"

import { NavigationEnd, Router, RouterLink } from "@angular/router"
import { toSignal, takeUntilDestroyed } from "@angular/core/rxjs-interop"
import { filter } from "rxjs"

import { BRAND } from "../config/brand.config"
import { Cart } from "../services/cart"
import { Status } from "../services/status"
import { SECTIONS, SectionId, SectionScroll } from "../shared/section-scroll"
import { StatusBadge } from "../shared/status-badge/status-badge"

interface NavLink {
  id:SectionId,
  label:string,
  icon:string
}

@Component({
  selector: "app-navigation-bar",
  imports: [RouterLink, StatusBadge],
  templateUrl: "./navigation-bar.html",
  styleUrl: "./navigation-bar.scss",
})

export class NavigationBar {
  private cartService:Cart = inject(Cart)
  private sectionScroll:SectionScroll = inject(SectionScroll)
  private router:Router = inject(Router)
  private document:Document = inject(DOCUMENT)

  readonly brand = BRAND
  readonly sections = SECTIONS

  readonly links:NavLink[] = [
    { id: SECTIONS.menu, label: "Ponuka", icon: "fa-solid fa-pizza-slice" },
    { id: SECTIONS.dailyMenu, label: "Denné menu", icon: "fa-solid fa-bowl-food" },
    { id: SECTIONS.contact, label: "Rezervácia", icon: "fa-solid fa-calendar-check" }
  ]

  readonly status = toSignal(inject(Status).status$, { initialValue: null }) // Restaurant Open / Closed Status
  readonly cart_count = toSignal(this.cartService.cart_amount$, { initialValue: 0 }) // Number Of Items In The Cart

  readonly is_menu_open = signal<boolean>(false) // Stores The Information If The Mobile Menu Is Open
  readonly is_scrolled = signal<boolean>(false) // Stores The Information If The Page Is Scrolled

  constructor() {
    const destroy_ref:DestroyRef = inject(DestroyRef)

    // Locks The Page Scroll While The Mobile Menu Is Open
    effect(() => {
      this.document.documentElement.classList.toggle("is-scroll-locked", this.is_menu_open())
    })

    // Closes The Mobile Menu After Every Navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(destroy_ref))
      .subscribe(() => this.closeMenu())

    afterNextRender(() => {
      this.onWindowScroll()

      // Closes The Mobile Menu When The Window Becomes Wide Enough For The Desktop Navigation
      const desktop_query:MediaQueryList = window.matchMedia("(min-width: 768px)")
      const onChange = (event:MediaQueryListEvent):void => { if(event.matches) this.closeMenu() }

      desktop_query.addEventListener("change", onChange)
      destroy_ref.onDestroy(() => desktop_query.removeEventListener("change", onChange))
    })
  }

  // Window Scroll Functionality
  @HostListener("window:scroll")
  onWindowScroll():void {
    this.is_scrolled.set(window.scrollY > 8) // Updates The Information If The Page Is Scrolled
  }

  // Closes The Mobile Menu With The Escape Key
  @HostListener("document:keydown.escape")
  onEscape():void {
    this.closeMenu()
  }

  // Method For Toggle The Mobile Menu
  toggleMenu():void {
    this.is_menu_open.update(is_open => !is_open)
  }

  // Method For Close The Mobile Menu
  closeMenu():void {
    this.is_menu_open.set(false)
  }

  // Method For Scroll To A Home Page Section
  go(id:SectionId, event?:Event):void {
    this.closeMenu()
    this.sectionScroll.go(id, event)
  }

  // Method For Scroll To The Top When The Logo Is Clicked On The Home Page
  onLogoClick():void {
    this.closeMenu()
    if(this.router.url.split(/[?#]/)[0] === "/") window.scrollTo({ top: 0 })
  }

  // Method For Show The Cart
  openCart():void {
    this.closeMenu()
    this.cartService.openCart()
  }
}
