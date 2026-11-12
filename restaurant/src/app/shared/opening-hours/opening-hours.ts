import { Component, inject, input } from "@angular/core"
import { toSignal } from "@angular/core/rxjs-interop"
import { OpeningHours as OpeningHoursService } from "../../services/opening-hours"

// Weekly Opening Hours (Renders Nothing When The Restaurant Has Not Set Any)
@Component({
  selector: "app-opening-hours",
  template: `
    @if(week().length > 0) {
      <dl class="hours" [class.hours--inverse]="tone() === 'inverse'">
        @for(day of week(); track day.day) {
          <div class="hours__row" [class.is-today]="day.is_today">
            <dt>{{ day.name }} @if(day.is_today) { <span class="hours__today">dnes</span> }</dt>
            <dd [class.is-closed]="!day.hours">{{ day.hours ?? "Zatvorené" }}</dd>
          </div>
        }
      </dl>
    }
  `,
  styles: `
    :host { display: block; }

    .hours {
      display: flex;
      flex-direction: column;
      font-size: var(--text-sm);
    }

    .hours__row {
      display: flex;
      justify-content: space-between;
      gap: var(--space-4);
      padding-block: var(--space-2);
      color: var(--color-text-muted);

      & + & { border-top: 1px dashed var(--color-border); }

      &.is-today {
        color: var(--color-text);
        font-weight: var(--weight-semibold);
      }
    }

    dd { font-variant-numeric: tabular-nums; white-space: nowrap; }
    dd.is-closed { color: var(--color-text-subtle); }

    .hours__today {
      margin-left: var(--space-1);
      padding: 1px var(--space-2);
      background-color: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      border-radius: var(--radius-pill);
    }

    .hours--inverse {
      .hours__row { color: var(--color-text-inverse-muted); }
      .hours__row + .hours__row { border-top-color: rgb(255 255 255 / 0.12); }
      .hours__row.is-today { color: var(--color-text-inverse); }
      dd.is-closed { color: rgb(255 255 255 / 0.45); }
      .hours__today { background-color: rgb(255 255 255 / 0.12); color: var(--color-accent); }
    }
  `
})
export class OpeningHours {
  readonly tone = input<"default"|"inverse">("default") // "inverse" For Dark Backgrounds (Footer)
  readonly week = toSignal(inject(OpeningHoursService).week$, { initialValue: [] })
}
