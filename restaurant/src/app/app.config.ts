import { ApplicationConfig, provideZonelessChangeDetection } from "@angular/core"
import { provideRouter } from "@angular/router"
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from "@angular/common/http"
import { provideClientHydration, withNoHttpTransferCache } from "@angular/platform-browser"
import { routes } from "./app.routes"
import { registerLocaleData } from "@angular/common"
import localeSk from "@angular/common/locales/sk"
import { LoadingInterceptor } from "./interceptors/loading-interceptor"

registerLocaleData(localeSk, "sk-SK")

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes), 
    provideClientHydration(withNoHttpTransferCache()), // Prerendered Pages Contain Build-Time API Data, So The Browser Always Fetches Fresh Data (Status, Dishes, Daily Menu)
    provideHttpClient(withInterceptorsFromDi()),

    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    }
  ]
}