import { Injectable, inject } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable, catchError, map, of, shareReplay } from "rxjs"
import { apiUrl } from "../config/api"

export interface OpeningHourResponse {
  day_of_week:number, // 1 = Monday … 7 = Sunday
  open_time:string,   // "HH:MM"
  close_time:string,
  is_closed_all_day:boolean
}

interface OpeningHoursResponse {
  success:boolean,
  message:string,
  today:number,
  opening_hours:OpeningHourResponse[]
}

// One Row Of The Weekly Schedule
export interface OpeningDay {
  day:number,
  name:string,
  hours:string|null, // e.g. "10:00 – 22:00", null When Closed
  is_today:boolean
}

const DAY_NAMES:string[] = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"]

// Builds All 7 Days (Days Without Hours Are Closed, Same As The Back-End Status)
export function buildWeek(hours:OpeningHourResponse[], today:number):OpeningDay[] {
  return DAY_NAMES.map((name, index) => {
    const day:number = index + 1
    const entry:OpeningHourResponse|undefined = hours.find(hour => hour.day_of_week === day)

    return {
      day,
      name,
      hours: entry && !entry.is_closed_all_day ? `${entry.open_time} – ${entry.close_time}` : null,
      is_today: day === today
    }
  })
}

@Injectable({ providedIn: "root" })
export class OpeningHours {
  private http:HttpClient = inject(HttpClient)

  // Weekly Schedule, Fetched Once And Shared (Empty When No Hours Are Set Or The Request Fails)
  readonly week$:Observable<OpeningDay[]> = this.http.get<OpeningHoursResponse>(apiUrl("opening-hours/")).pipe(
    map(response => response?.success && response.opening_hours.length > 0 ? buildWeek(response.opening_hours, response.today) : []),
    catchError((error) => {
      console.error(error)
      return of<OpeningDay[]>([])
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  )
}
