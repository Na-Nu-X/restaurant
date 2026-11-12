import { Pipe, PipeTransform } from "@angular/core"
import { BRAND } from "../config/brand.config"

const formatter:Intl.NumberFormat = new Intl.NumberFormat(BRAND.locale, {
  style: "currency",
  currency: BRAND.currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

// Formats A Price In Cents Using The Brand Locale And Currency (e.g. 1250 -> "12,50 €")
export function formatPrice(cents:number|null|undefined):string {
  return formatter.format((cents ?? 0) / 100)
}

@Pipe({ name: "price" })
export class PricePipe implements PipeTransform {
  transform(cents:number|null|undefined):string {
    return formatPrice(cents)
  }
}
