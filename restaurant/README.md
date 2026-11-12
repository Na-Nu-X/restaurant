# Restaurant – Front-End

The Angular 22 front-end of the restaurant website. See the [main README](../README.md) for setup, configuration and deployment.

```bash
npm install
npx ng serve                  # Development server on http://localhost:4200 (back-end expected on port 8001)
npx ng build                  # Production build into dist/restaurant/
npx ng test --watch=false     # Unit tests (Vitest)
npm run serve:ssr:restaurant  # Runs the built server-side rendering server
```

Per-restaurant content is in `src/app/config/brand.config.ts`, colors and fonts in `src/partials/_theme.scss`.
