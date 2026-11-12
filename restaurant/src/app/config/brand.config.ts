/******************************************************************************
 Brand Configuration

 Everything that changes from one restaurant (client) to another lives here.
 To set up the website for a new restaurant:

   1. Edit the values in `BRAND` below.
   2. Edit the brand colors / fonts in `src/partials/_theme.scss`.
   3. Replace the images in `public/images/` (logo, hero, favicon).
   4. Set `apiBaseUrl` in `src/environments/environment.ts`.
******************************************************************************/

export type SocialNetwork = "instagram" | "facebook" | "tiktok" | "x" | "youtube"

export type PaymentMethod = "visa" | "mastercard" | "amex" | "discover" | "diners_club" | "jcb"

export interface BrandConfig {
  // Restaurant Name (Shown In The Navigation, Footer, Browser Tab)
  name:string

  // SEO Description (Search Results, Social Media Previews)
  description:string

  // Optional Logo Image (Path Inside `public/`), The Name Is Shown As Text If Not Set
  logo:{ src:string, alt:string } | null

  // First Section Of The Home Page
  hero:{
    title:string,          // Main Headline (Keep It Short, ~6 Words)
    subtitle:string,       // One Or Two Sentences Under The Headline
    image:string,          // Path Inside `public/`. Portrait (4:5) Food Photo, ~1000px Wide, WebP, Under ~250 KB
    imageSmall?:string,    // Optional ~600px Wide Version For Phones
    imageAlt:string,
    highlights:{ icon:string, text:string }[] // Short Selling Points Under The Buttons (Font Awesome Icon Classes)
  }

  contact:{
    email:string,
    phone:string,        // Machine Format Used In `tel:` Links (e.g. "+421940322633")
    phoneDisplay:string  // Human Readable Format (e.g. "+421 940 322 633")
  }

  address:{
    street:string,
    postalCode:string,
    city:string,
    country:string,
    mapEmbedUrl:string, // Google Maps → Share → Embed A Map → Copy The `src` Value
    mapLink:string      // Link Opened By "Navigate" Buttons
  }

  social:Partial<Record<SocialNetwork, string>>

  // Card Brands Shown In The Footer (Icons From `public/images/<name>.png`)
  paymentMethods:PaymentMethod[]

  // Checkout Settings
  checkout:{
    tipOptions:number[],      // Tip Percentages Offered For Card Payments (0 = No Tip)
    defaultTipPercent:number  // Preselected Tip (Must Be One Of `tipOptions`)
  }

  // Formatting Of Prices
  locale:string
  currency:string
}

export const BRAND:BrandConfig = {
  name: "Reštaurácia",
  description: "Denné menu, rozvoz jedla a online objednávky. Objednajte si obľúbené jedlá rýchlo a jednoducho.",

  logo: null,
  hero: {
    title: "Poctivé jedlo, doručené až k vám domov.",
    subtitle: "Vyberte si z nášho menu, objednajte online za pár kliknutí a zaplaťte kartou alebo pri doručení.",
    image: "images/hero.webp",
    imageSmall: "images/hero-sm.webp",
    imageAlt: "Čerstvo pripravené jedlo z našej kuchyne",
    highlights: [
      { icon: "fa-solid fa-credit-card", text: "Kartou alebo pri doručení" },
      { icon: "fa-solid fa-location-dot", text: "Sledovanie objednávky" },
      { icon: "fa-solid fa-utensils", text: "Denné obedové menu" }
    ]
  },

  contact: {
    email: "behulpatrik@gmail.com",
    phone: "+421940322633",
    phoneDisplay: "+421 940 322 633"
  },

  address: {
    street: "Mlynské nivy 5/A",
    postalCode: "821 08",
    city: "Bratislava",
    country: "Slovensko",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d170411.37760859914!2d16.950700206516654!3d48.135737106169756!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x476c89360aca6197%3A0x631f9b82fd884368!2sBratislava!5e0!3m2!1sen!2ssk!4v1784274678048!5m2!1sen!2ssk",
    mapLink: "https://maps.google.com/?q=Mlynsk%C3%A9+nivy+5%2FA%2C+Bratislava"
  },

  social: {
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    tiktok: "https://www.tiktok.com/"
  },

  paymentMethods: ["visa", "mastercard", "amex", "discover", "diners_club", "jcb"],

  checkout: {
    tipOptions: [0, 5, 10, 15],
    defaultTipPercent: 10
  },

  locale: "sk-SK",
  currency: "EUR"
}
