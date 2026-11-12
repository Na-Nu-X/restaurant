import { environment } from "../../environments/environment"

// Back-End Base URL Without The Trailing Slash
export const API_BASE_URL:string = environment.apiBaseUrl.replace(/\/+$/, "")

// Builds The Full URL Of A Back-End API Endpoint (e.g. apiUrl("dishes/") -> "http://127.0.0.1:8001/api/dishes/")
export function apiUrl(path:string):string {
  return `${API_BASE_URL}/api/${path.replace(/^\/+/, "")}`
}
