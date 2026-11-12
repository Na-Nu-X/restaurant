import { RenderMode, ServerRoute } from "@angular/ssr"

export const serverRoutes: ServerRoute[] = [
  // Order Tracking Pages Are Unique Per Order, So They Are Rendered In The Browser
  {
    path: "objednavka/:tracking_code",
    renderMode: RenderMode.Client
  },

  {
    path: "**",
    renderMode: RenderMode.Prerender
  }
]
