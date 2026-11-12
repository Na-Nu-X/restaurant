import { Injectable, computed, signal } from "@angular/core"

// Global Loading State: Counts The Pending HTTP Requests (Updated By `LoadingInterceptor`)
@Injectable({
  providedIn: "root",
})
export class Loading {
  private readonly pending = signal<number>(0)

  readonly is_loading = computed<boolean>(() => this.pending() > 0) // True While At Least One Request Is Pending

  // Method For Register A Started Request
  show():void {
    this.pending.update(count => count + 1)
  }

  // Method For Register A Finished Request
  hide():void {
    this.pending.update(count => Math.max(0, count - 1))
  }
}
