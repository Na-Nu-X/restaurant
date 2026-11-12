import { Component, inject } from "@angular/core"
import { Toast, ToastMessage } from "./toast.service"

const ICONS:Record<ToastMessage["tone"], string> = {
  success: "fa-solid fa-circle-check",
  error: "fa-solid fa-circle-exclamation",
  info: "fa-solid fa-circle-info"
}

// Renders The Toast Messages (Placed Once In The App Shell)
@Component({
  selector: "app-toast-host",
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for(message of toast.messages(); track message.id) {
        <div class="toast" [class]="'toast toast--' + message.tone">
          <i [class]="icons[message.tone]" aria-hidden="true"></i>
          <p class="toast__text">{{ message.text }}</p>

          @if(message.action; as action) {
            <button type="button" class="toast__action" (click)="action.run(); toast.dismiss(message.id)">{{ action.label }}</button>
          }

          <button type="button" class="toast__close" aria-label="Zavrieť oznámenie" (click)="toast.dismiss(message.id)">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      left: 50%;
      bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: min(calc(100% - 2 * var(--gutter)), 420px);
      transform: translateX(-50%);
      z-index: var(--z-toast);
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
      background-color: var(--color-surface-inverse);
      color: var(--color-text-inverse);
      font-size: var(--text-sm);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      pointer-events: auto;
      animation: toast-in var(--duration) var(--ease-out);
    }

    .toast--success > i { color: #4ade80; }
    .toast--error > i { color: #f87171; }
    .toast--info > i { color: var(--color-accent); }

    .toast__text { flex: 1; line-height: var(--leading-snug); }

    .toast__action {
      padding: var(--space-2) var(--space-3);
      background: none;
      color: var(--color-accent);
      font-weight: var(--weight-semibold);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      white-space: nowrap;
    }

    .toast__action:hover { background-color: rgb(255 255 255 / 0.08); }

    .toast__close {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      background: none;
      color: var(--color-text-inverse-muted);
      border: none;
      border-radius: 50%;
      cursor: pointer;
    }

    .toast__close:hover { color: var(--color-text-inverse); background-color: rgb(255 255 255 / 0.08); }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
    }
  `
})
export class ToastHost {
  readonly toast:Toast = inject(Toast)
  readonly icons = ICONS
}
