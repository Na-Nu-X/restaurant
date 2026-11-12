# Restaurant Website

A complete website for a restaurant with online ordering: a digital menu, a daily lunch menu, online payments by card (Stripe) or cash on delivery, live order tracking, table reservations and an administration panel for the staff.

The website is built to be **re-branded for any restaurant** — name, contacts, colors, fonts and photos are set in a few configuration files, without touching the code.

- **Front-end:** Angular 22 (server-side rendering), in [`restaurant/`](restaurant/)
- **Back-end:** Django 6 + PostgreSQL + Stripe, administration built with Unfold, in [`backend/`](backend/)
- **Language of the website and the administration:** Slovak

---

## Contents

1. [What the website offers](#what-the-website-offers)
2. [For the restaurant: everyday work in the administration](#for-the-restaurant-everyday-work-in-the-administration)
3. [Setting the website up for a new restaurant](#setting-the-website-up-for-a-new-restaurant)
4. [Running the project locally](#running-the-project-locally)
5. [Going live (deployment)](#going-live-deployment)
6. [Tests](#tests)
7. [Project structure](#project-structure)
8. [License](#license)

---

## What the website offers

**For customers**

- **Menu** with photos, prices, ratings and allergens, a search (works without diacritics — "kuraci" finds "Kurací") and category filters.
- **Customizable dishes** — sizes, side dishes, extras with surcharges, required and optional choices.
- **Daily lunch menu** with today's soup and main dishes.
- **Cart and a two-step checkout** — delivery details are remembered for the next order; payment by card online (Stripe) or cash on delivery; optional tip; discount coupons.
- **Order confirmation and live tracking** — a progress bar (Received → Preparing → On the way → Delivered) that refreshes automatically, and a dish rating after delivery.
- **Opening hours and an open / closed badge** — orders are accepted only during opening hours.
- **Reservations and contact** — phone, e-mail, address with navigation, map and a message form.
- Works on phones, tablets and computers.

**For the restaurant**

- An administration panel for orders, the menu, the daily menu, opening hours, coupons, messages and ratings.
- Prices are always calculated on the server from the menu, so a customer cannot change what they pay.

---

## For the restaurant: everyday work in the administration

The administration is at **`https://<your-domain>/<ADMIN_URL>`** — the secret address is set by the `ADMIN_URL` setting (see [Configuration](#3-back-end-settings-restaurantenv)). Log in with the account created for you.

> **Prices are entered in cents.** `1250` means **12,50 €**, `90` means **0,90 €**. This applies to dishes, extras and daily menu meals.

### Orders (`Objednávky`)

Newest orders are at the top. Every order shows a colored status, the customer and their phone, the ordered dishes **including the chosen options** (e.g. `2× Pizza (45 cm, Syr navyše)`), the total and the payment method.

- **Filters** on the right: `Obdobie` (today, yesterday, last 7 days), `Aktívne objednávky` (orders still in progress), status and payment method.
- **Changing the status:** tick one or more orders, choose an action such as **`Označiť ako: Na ceste`** and confirm. The status can also be changed on the order's detail page.
- The customer sees every status change on their tracking page within 30 seconds.

| Status | Meaning | Who sets it |
| --- | --- | --- |
| `Čaká na platbu` | The customer is paying by card in Stripe | Automatically |
| `Zaplatená` | The card payment succeeded | Automatically |
| `Pripravuje sa` | You are preparing the food (cash orders start here) | You |
| `Na ceste` | The courier has left | You |
| `Doručená` | Delivered — the customer can now rate the dishes | You |
| `Zrušená` | Cancelled (unfinished card payments are cancelled automatically) | Automatically / you |

### Menu

| Section | What it is for |
| --- | --- |
| `Jedlá` | Dishes: name (max. 20 characters), description, price in cents, photo, category and allergens. |
| `Kategórie` / `Skupiny filtrov` | The filter chips above the menu. Categories are grouped (e.g. *By type*, *By cuisine*); each dish belongs to one category. A category can have a [Font Awesome](https://fontawesome.com/icons) icon. |
| `Skupiny úprav jedál` / `Položky úprav` | Options of a dish, e.g. a group *"Choose a size"* (required, one choice) with items *32 cm* and *45 cm (+400)*. Groups can be required or optional, single or multiple choice. |
| `Alergény` | The list of allergens (number + name) assigned to dishes. |

**Tip:** use landscape or square photos of about 1200 px; large photos slow down the menu on phones.

### Daily menu (`Denné menu - Polievky`, `Denné menu - Hlavné jedlá`)

Each weekday has one soup and any number of main dishes (numbered; price in cents). Untick `Je aktívna` (soups) or `Je aktívne` (meals) to hide an item without deleting it. The website shows the menu of the current day.

### Opening hours and closures

- `Otváracie hodiny` — one row per weekday with opening and closing time, or `Zatvorené celý deň`. **Days without a row are shown as closed**, and orders are not accepted outside these hours.
- `Globálne nastavenia` — tick `Je mimoriadne zatvorené` for holidays or emergencies; the `Dôvod zatvorenia` is shown on the website and ordering is paused until you untick it.

### Other sections

- `Kupóny` — discount codes in percent, optionally with an expiry date. Discounts apply to food, not to the tip.
- `Správy` — messages and reservation requests from the contact form (they are also sent to the restaurant's e-mail).
- `Hodnotenie jedál` — star ratings from customers; the average is shown on each dish.

---

## Setting the website up for a new restaurant

Everything that differs between restaurants lives in these places:

| What | Where |
| --- | --- |
| Name, description, hero texts, contacts, address, map, social networks, accepted cards, tip options, currency | [`restaurant/src/app/config/brand.config.ts`](restaurant/src/app/config/brand.config.ts) |
| Colors and fonts | [`restaurant/src/partials/_theme.scss`](restaurant/src/partials/_theme.scss) — the **Brand** block at the top |
| Font files | [`restaurant/src/index.html`](restaurant/src/index.html) — the Google Fonts link must match the fonts in the theme |
| Photos and favicon | [`restaurant/public/`](restaurant/public/) |
| Address of the back-end | [`restaurant/src/environments/environment.ts`](restaurant/src/environments/environment.ts) (production) |
| Secrets, domains, Stripe, e-mail | `restaurant/.env` (see below) |
| Administration title and colors | `UNFOLD` in [`backend/core/settings.py`](backend/core/settings.py) |

### 1. Brand and content (`brand.config.ts`)

Edit the values in `BRAND`. Every field is commented. The most important ones:

- `name`, `description` — shown in the header, footer, browser tab and search results.
- `hero` — the headline, subtitle and photo on the first screen, plus three short selling points.
- `contact`, `address` — phone (`phone` for links, `phoneDisplay` for people), e-mail, address, a Google Maps **embed** URL (*Share → Embed a map → copy the `src`*) and a navigation link.
- `social` — leave out networks the restaurant does not use.
- `checkout.tipOptions`, `checkout.defaultTipPercent` — tip choices for card payments (to turn tips off, use `tipOptions: [0]` and `defaultTipPercent: 0`).

### 2. Colors and fonts (`_theme.scss`)

Change the four brand colors — every hover, tint and border is derived from them automatically:

```scss
--brand-primary: #c2410c;  // Buttons, links, prices. Needs at least 4.5:1 contrast with white text.
--brand-accent:  #f59e0b;  // Ratings and highlights.
--brand-ink:     #1f1a17;  // Text and the dark footer.
--brand-canvas:  #fffbf5;  // Page background.
```

To change the fonts, update `--font-heading` and `--font-body` and the Google Fonts link in `index.html`. Fonts must support Slovak characters (latin-ext).

### 3. Photos

- **Hero photo:** a portrait (about 4:5) WebP image around 1000 px wide and under ~250 KB, plus an optional ~600 px version for phones. Put them in `restaurant/public/images/` and set `hero.image` / `hero.imageSmall`.
- **Favicon:** replace `restaurant/public/favicon.ico`.
- **Logo (optional):** set `logo: { src, alt }`; without a logo the name is shown as text.
- Dish photos are uploaded in the administration.

### 4. Back-end settings (`restaurant/.env`)

The Django back-end reads its settings from **`restaurant/.env`** (not from `backend/`). Never commit this file.

| Variable | Description |
| --- | --- |
| `SECRET_KEY` | Django secret key — a long random string, unique per installation. |
| `DEBUG` | `True` only for local development. |
| `ALLOWED_HOSTS` | Comma-separated host names of the back-end, e.g. `api.restaurant.sk`. |
| `ADMIN_URL` | Secret path of the administration **with a trailing slash**, e.g. `spravca-8f3k2/`. Required. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Database credentials. Host and port (`localhost:5433`) are set in `backend/core/settings.py`. |
| `FRONT_END_DOMAIN_URL` | Public URL of the website with a trailing slash, e.g. `https://restaurant.sk/`. Used for CORS and the Stripe return pages. |
| `DOMAIN_URL` | Public domain of the back-end, used to show dish photos in Stripe Checkout. |
| `IS_LOCAL` | `True` uses placeholder images in Stripe Checkout (Stripe cannot load images from your computer). `False` in production. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | From the restaurant's Stripe account (see [Stripe](#stripe)). |
| `STRIPE_PUBLISHABLE_KEY` | Read by the settings but currently not used (Stripe Checkout is a redirect). |
| `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` | SMTP account; messages from the contact form are delivered to `EMAIL_HOST_USER`. |
| `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_*` | HTTPS hardening for production. |

---

## Running the project locally

### Requirements

- **Node.js** 22.22+ (or 24.15+) and npm
- **Python** 3.12 or newer
- **PostgreSQL** listening on `localhost:5433`

### Back-end

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser    # Your administration account
python manage.py runserver 8001     # The front-end expects port 8001
```

### Front-end

```bash
cd restaurant
npm install
npx ng serve                        # http://localhost:4200
```

On Linux with GNOME, `./run_dev.sh` in the repository root starts both servers in separate terminal windows (it expects the Angular CLI installed globally).

The administration runs at `http://127.0.0.1:8001/<ADMIN_URL>`.

> If the menu stays empty and the browser console shows `ERR_CONNECTION_REFUSED`, the back-end is not running on port 8001. After an operating-system upgrade, recreate `backend/.venv` if `python manage.py` reports that Django cannot be imported.

---

## Going live (deployment)

**Front-end**

1. Set `apiBaseUrl` in `restaurant/src/environments/environment.ts` to the public URL of the back-end.
2. Build: `cd restaurant && npx ng build` → output in `restaurant/dist/restaurant/`.
3. Run the server-side rendering server with `npm run serve:ssr:restaurant` (Node.js, port 4000 by default; set `PORT` to change it) behind your web server.

**Back-end**

1. Use `DEBUG=False`, a fresh `SECRET_KEY`, real `ALLOWED_HOSTS`, `FRONT_END_DOMAIN_URL`, `DOMAIN_URL` and `IS_LOCAL=False`.
2. Run `python manage.py migrate` and serve Django with a production server (e.g. Gunicorn) behind HTTPS.
3. **Uploaded dish photos** (`backend/media/`) are served by Django only in `DEBUG` mode — configure your web server to serve `/media/`.
4. Adjust the database `HOST` / `PORT` in `backend/core/settings.py` if your database is not on `localhost:5433`.

### Stripe

1. Create a Stripe account for the restaurant and copy the **secret key** into `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint `https://<back-end-domain>/api/stripe-webhook/` with the events **`checkout.session.completed`** and **`checkout.session.expired`**, and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Without the webhook, card orders stay in `Čaká na platbu` even after a successful payment.

For local testing, the [Stripe CLI](https://docs.stripe.com/stripe-cli) can forward events: `stripe listen --forward-to localhost:8001/api/stripe-webhook/`.

---

## Tests

```bash
# Back-end (creates a temporary test database)
cd backend && source .venv/bin/activate && python manage.py test app

# Front-end (Vitest)
cd restaurant && npx ng test --watch=false
```

---

## Project structure

```
backend/
  app/
    models.py        Menu, orders, opening hours, coupons, ...
    ordering.py      Validation and pricing of orders
    views.py         JSON API under /api/...
    admin.py         Administration (Unfold)
  core/settings.py   Django settings (reads restaurant/.env)
restaurant/
  src/app/
    config/          brand.config.ts (per-restaurant content), api.ts
    services/        Communication with the back-end, cart
    shared/          Reusable pieces (price formatting, toasts, status badge, ...)
    <component>/     One folder per page section or page
  src/partials/      _theme.scss (colors, fonts, spacing), mixins, breakpoints
  public/            Images and favicon
run_dev.sh           Starts both development servers
```

Developer notes on the architecture and conventions are in [`CLAUDE.md`](CLAUDE.md).

---

## License

Released under the [GNU General Public License v3.0](LICENSE).
