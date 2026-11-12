import { Component, computed, input } from "@angular/core"
import type { StatusResponse } from "../../services/status"

// Open / Closed Pill (e.g. "Otvorené · do 22:00", "Zatvorené · otvárame o 10:00")
@Component({
  selector: "app-status-badge",
  template: `
    @if(status(); as s) {
      @if(s.success) {
        <span class="badge" [class.badge--success]="s.is_open" [class.badge--danger]="!s.is_open" [class.large]="size() === 'lg'">
          <span class="badge__dot" [class.pulse]="s.is_open" aria-hidden="true"></span>
          <span>{{ label() }}</span>
        </span>
      }
    } @else {
      <span class="badge" [class.large]="size() === 'lg'" aria-hidden="true">&nbsp;</span>
    }
  `,
  styles: `
    :host { display: inline-flex; }
    .large { padding: var(--space-2) var(--space-4); font-size: var(--text-sm); }
    .pulse { animation: pulse 2s ease-out infinite; }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 color-mix(in oklab, currentColor 50%, transparent); }
      70%, 100% { box-shadow: 0 0 0 6px transparent; }
    }
  `
})
export class StatusBadge {
  readonly status = input<StatusResponse|null|undefined>(null)
  readonly size = input<"md"|"lg">("md")
  readonly compact = input<boolean>(false) // Omits The Closure Reason (For Tight Spaces Like The Header)

  // Human Readable Label Built From The Status Response
  readonly label = computed<string>(() => {
    const s = this.status()
    if(!s) return ""

    const title:string = s.status || (s.is_open ? "Otvorené" : "Zatvorené")

    if(s.is_open && s.open_till) return `${title} · do ${s.open_till}`
    if(!s.is_open && s.next_open) return `${title} · otvárame o ${s.next_open}`
    if(!s.is_open && s.reason && !this.compact()) return `${title} · ${s.reason}`
    return title
  })
}
