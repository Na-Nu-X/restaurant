import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DishService {
  private apiUrl = 'http://localhost:8001/api/dishes/' // Django PORT 8001

  constructor(private http: HttpClient) {}

  // Funkcia, ktorá pošle HTTP GET požiadavku do Djanga a vráti zoznam jedál
  getDishes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}