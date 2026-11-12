import { Injectable, signal } from "@angular/core"

export type ToastTone = "success" | "error" | "info"

export interface ToastAction {
  label:string,
  run:() => void
}

export interface ToastMessage {
  id:number,
  tone:ToastTone,
  text:string,
  action?:ToastAction
}

// Small Non-Blocking Notifications (Replacement For `alert()`)
@Injectable({ providedIn: "root" })
export class Toast {
  private next_id:number = 0
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>()

  readonly messages = signal<ToastMessage[]>([])

  show(text:string, options:{ tone?:ToastTone, action?:ToastAction, duration?:number } = {}):void {
    const message:ToastMessage = { id: ++this.next_id, tone: options.tone ?? "info", text, action: options.action }

    this.messages.update(list => [...list.slice(-2), message]) // Keeps At Most 3 Messages On Screen
    this.timers.set(message.id, setTimeout(() => this.dismiss(message.id), options.duration ?? 4000))
  }

  success(text:string, action?:ToastAction):void {
    this.show(text, { tone: "success", action })
  }

  error(text:string):void {
    this.show(text, { tone: "error", duration: 6000 })
  }

  dismiss(id:number):void {
    clearTimeout(this.timers.get(id))
    this.timers.delete(id)
    this.messages.update(list => list.filter(message => message.id !== id))
  }
}
