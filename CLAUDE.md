# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Food-ordering website for a single restaurant. Two independent apps in one repo:

- `restaurant/` — Angular 22 front-end (standalone components, zoneless change detection, SSR with prerendering of all routes).
- `backend/` — Django 6 back-end (single app `app/`, project config in `core/`), PostgreSQL, Stripe Checkout, `django-unfold` admin.

All user-facing text, model `verbose_name`s and API `message` strings are in **Slovak**; keep new strings in Slovak.

## Commands

Start both servers (opens two gnome-terminals): `./run_dev.sh`

Front-end (run in `restaurant/`):
- `npm install`
- `ng serve` — dev server on http://localhost:4200
- `ng build` — production build to `dist/restaurant/` (browser + server bundles)
- `npm run serve:ssr:restaurant` — run the built SSR Express server
- `ng test --watch=false` — Vitest unit tests (via `@angular/build:unit-test`, jsdom); a single file: `ng test --include src/app/services/cart.spec.ts`
- Formatting: Prettier (`.prettierrc`: printWidth 100, single quotes)

Back-end (run in `backend/`, virtualenv at `backend/.venv`):
- `source .venv/bin/activate && pip install -r requirements.txt`
- `python manage.py runserver 8001` — the front-end hard-codes port **8001**
- `python manage.py makemigrations && python manage.py migrate`
- `python manage.py test app` (`app/tests.py` is currently empty)

## Configuration

- Django loads env vars from **`restaurant/.env`** (not `backend/.env`) — see `ENV_PATH` in `backend/core/settings.py`.
- Required vars include `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `ADMIN_URL` (admin path is env-configured, the URLconf breaks if unset), `POSTGRES_DB/USER/PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONT_END_DOMAIN_URL` (used for CORS and Stripe success/cancel URLs), `DOMAIN_URL`, `IS_LOCAL`, and `EMAIL_*`.
- PostgreSQL is expected on `localhost:5433` (non-default port).
- `IS_LOCAL=True` makes Stripe line items use dummyimage.com placeholder images instead of media URLs.
- Uploaded dish images go to `backend/media/dishes/` and are served by Django only when `DEBUG`.

## Architecture

### Back-end
- Plain Django function views returning `JsonResponse` (DRF is installed but not used for views/serializers). Every endpoint is under `/api/...` in `backend/app/urls.py`, mostly `@csrf_exempt`, and responds with `{"success": bool, "message": str, ...}`.
- **All money is integer cents** (`Dish.price`, `DailyMeal.price`, `DishModifierItem.extra_price`, `Order.price/total_price`, `OrderItem.price_at_purchase`).
- Restaurant open/closed state: `RestaurantConfig` (single row, force-close switch) + `OpeningHour` per ISO weekday (1=Monday). `getStatus` computes it, and `createCheckoutSession`/`createOrder` call `getStatus` internally to reject orders when closed.
- Two order flows:
  - **Card**: `create-checkout-session` creates an `Order` with status `PENDING` + `OrderItem`s, then a Stripe Checkout Session (`metadata.order_id`). `stripe-webhook` sets `PAID` on `checkout.session.completed` and `CANCELLED` on `checkout.session.expired`. The Stripe cancel URL returns to `/?cancel_order_code=...`, and the front-end then calls `cancel-order/<code>/` (only cancels `PENDING` orders).
  - **Cash on delivery**: `create-order` creates the order directly as `PREPARING` with `cash_on_delivery=True`.
- Tips travel as a pseudo cart item with `id == -1`. They are stored as `OrderItem(is_tip=True, dish=None)` and never discounted. Coupon discounts (`Coupon.discount_percent`) apply only to dish items.
- Order creation goes through `app/ordering.py`: `buildOrderDraft()` validates the cart (dish exists, quantity 1–50, option ids belong to the dish, required/single-choice group rules) and prices every line from the database (`Dish.price` + option `extra_price`, coupon via `applyDiscount()` = integer half-up rounding, mirrored by the front-end). Only the tip amount comes from the client. `saveOrder()` stores `Order`, `OrderItem`s and the chosen options as `OrderItemModifier` snapshots (title + surcharge). Raise `OrderValidationError` with a Slovak message for anything the customer should see (views return it with status 400).
- The card flow creates the order and the Stripe session inside one `transaction.atomic()`, so a Stripe failure leaves no order behind; chosen options appear as the Stripe line item `description`.
- Back-end tests live in `app/tests.py` (`python manage.py test app`); they mock `app.views._checkOpen` and `stripe.checkout.Session.create`.
- `Order.tracking_code` is a unique 6-character code generated in `Order.save()`. Customers track orders at `/objednavka/:tracking_code` and can rate dishes (`Rating`, unique per dish+order). Order data is only ever looked up by tracking code: `order-status/<code>/` returns the details plus `items` (with `modifiers` and any existing `rating`) and `tip`; never add endpoints keyed by the sequential order `id`.
- Dishes can have `DishModifierGroup`s → `DishModifierItem`s (side/extra options with surcharges). Filters: `FilterGroup` → `Category` (Font Awesome icon class) → `Dish`.
- Daily lunch menu: `DailySoup` (one per weekday) and `DailyMeal` (many per weekday, ordered by `number`), served by `today-menu`.

### Front-end
- Routes in `src/app/app.routes.ts`: `""` Home, `success` (after Stripe) and `success-order` (after cash order) — both render `OrderConfirmation`, told apart by route `data.kind` — and `objednavka/:tracking_code` (tracking). Route `title`s are formatted as "Page | BRAND.name" by `BrandTitleStrategy` (`shared/brand-title-strategy.ts`); don't set `document.title` manually.
- Each component is a folder `name/name.{ts,html,scss,spec.ts}` with no `.component` suffix. Classes are named without suffixes (e.g. services `Dish`, `Cart`, `Order`, `Payment`, `Status`, `Message`, `Loading` in `src/app/services/`). Older components inject them via constructor as `dishService`, `cartService`, etc.
- Back-end URL lives in `src/environments/environment*.ts` (`environment.development.ts` is swapped in for `ng serve` via `fileReplacements`). Services build URLs with `apiUrl("dishes/")` from `src/app/config/api.ts`; never hard-code the host.
- **White-label setup:** all client-specific content (name, contacts, address, map embed, socials, payment icons, locale/currency) is in `src/app/config/brand.config.ts`; colors and fonts are CSS custom properties in `src/partials/_theme.scss` (only the "Brand" block needs editing; shades derive via `color-mix`). Fonts are loaded in `src/index.html` and must match `--font-heading` / `--font-body`.
- Styling system: use `var(--token)` and the global classes in `src/styles.scss` (`.btn .btn--primary|secondary|soft|ghost`, `.icon-btn`, `.input`, `.field`, `.chip`, `.badge--*`, `.card`, `.container`, `.section`) or the matching mixins (`@use "../../partials/mixins" as *;` → `button_primary`, `input_base`, `icon_button`, `container`, mobile-first `bp(sm|md|lg|xl)`). `_variables.scss` only holds `$breakpoints`; there are no Sass color/font variables — never hard-code colors, add a token to `_theme.scss` instead. Use `@use`, not the deprecated `@import`.
- Format prices with the `price` pipe (`src/app/shared/price.pipe.ts`, cents → "12,50 €") rather than the long `currency:'EUR':...` expression.
- `objednavka/:tracking_code` is client-rendered (`app.routes.server.ts`); every other route is prerendered.
- App shell: `NavigationBar` (header only) + router outlet + `Footer` + `CartDrawer` + `ToastHost`. The header opens the cart via `Cart.openCart()` → `open_requests$`; never put cart UI back into the header.
- `CartDrawer` (native `<dialog>`, full screen on phones, right side panel from 768px) has two steps: cart lines (quantity, remove with inline undo, coupon) and delivery/payment (validated form, card vs. cash, tip only for card). Totals come from `calculateTotals()` in `services/cart.ts`; the payload from `buildOrderPayload()` in `services/payment.ts` (sends `modifier_ids`, the tip as a pseudo line with id `-1`). Tip options/default are in `BRAND.checkout`.
- Toasts render below an open modal `<dialog>` (top layer + inert background), so feedback inside the drawer or the dish panel must be inline, not a toast.
- Home sections are scrolled to with `SectionScroll.go(SECTIONS.menu)` (`src/app/shared/section-scroll.ts`); the fixed-header offset comes from `scroll-padding-top` in `styles.scss`, so don't hard-code pixel offsets. Use `/#<id>` hrefs for links.
- Restaurant open/closed state: subscribe to the shared, cached `Status.status$` (or `toSignal` it) and render with `<app-status-badge>`; don't call the status endpoint per component.
- Redesigned components (header, hero `Banner`, `DailyMenu`) use signals (`signal`, `computed`, `toSignal`, `input`) and `inject()`; follow that style for new/redesigned components.
- Menu: `Catalog` owns the menu state (dishes, `query`, `category`, `selected_dish` signals; search is accent-insensitive and combined with the category). Presentational pieces: `SearchBar` (`[(value)]`), `Filters` chips (`[(selected)]`, one category at a time because a dish has a single `category_id`), `DishCard`, and `DishDetail` (native `<dialog>`: bottom sheet on phones, centered from 768px; owns option selection, required-group validation and quantity — never write selections onto the dish object).
- `Cart` is signal-based (`items`, `count`, `subtotal`). Use `addToCart(dish, modifiers, quantity)`, `setQuantity(line_key, n)`, `remove(line_key)`, `restoreLine()`. `price` on a cart line is the unit price including option surcharges; lines with the same dish + options (`line_key`) are merged.
- User feedback: use the `Toast` service (`shared/toast`, host is in the app shell), not `alert()`.
- Hero text from `BRAND.hero` goes through `bindShortWords()` (`shared/typography.ts`) so Slovak one-letter words don't end a line.
- The app is zoneless: a plain field assigned in an RxJS callback does not re-render the view. Hold async UI state in signals (older components still use `ChangeDetectorRef.detectChanges()`).
- `Cart` persists cart items (`cart_items`), and `CartDrawer` persists customer delivery data (`customer`), to `localStorage`. These accesses are guarded with `typeof window !== "undefined"` / `isPlatformBrowser` because of SSR; keep that guard for any browser-only API.
- `LoadingInterceptor` (registered via `HTTP_INTERCEPTORS`) drives the global spinner through the `Loading` service, which counts pending requests in a signal (`is_loading()`).
- `TrackOrder` shows a 4-step progress bar (`progressStep()` maps statuses; `CANCELLED` has no bar), items with options, delivery details and per-dish rating for `COMPLETED` orders, and polls every 30 s while the order is active.
- Opening hours: `OpeningHours` service (`services/opening-hours.ts`, cached `week$` from `/api/opening-hours/`) and the `<app-opening-hours>` list (`tone="inverse"` on dark backgrounds); days without an `OpeningHour` row are shown as closed, matching `getStatus`.
- Home page sections: `Banner` (hero), `DailyMenu`, `Catalog` (inside `#menu`), `ContactSection` (`#kontakt`: contact details, opening hours, `ContactForm`, `Map`). Contact details, map and footer content all come from `BRAND`.
- Code style: snake_case for fields and local variables, `Title Case` explanatory trailing comments on most lines, and double quotes in most TS files (despite the Prettier single-quote setting).
