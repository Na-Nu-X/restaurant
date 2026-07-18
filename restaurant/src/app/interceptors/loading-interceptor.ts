import { Injectable } from "@angular/core"
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from "@angular/common/http"
import { Observable } from "rxjs"
import { finalize } from "rxjs/operators"
import { Loading } from '../services/loading'

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private LoadingService:Loading) { }

  intercept(req:HttpRequest<any>, next:HttpHandler):Observable<HttpEvent<any>> {
    this.LoadingService.show() // Shows The Loader

    return next.handle(req).pipe(
      finalize(() => this.LoadingService.hide()) // Hides The Loader
    )
  }
}