# Analytics app

A unified analytics library for tldraw.com that integrates multiple analytics services with cookie consent management.

## Purpose

This package provides a single, consolidated analytics interface that:

- Integrates multiple analytics providers (PostHog, Google Analytics 4, HubSpot, Reo)
- Manages cookie consent with a UI banner and privacy settings dialog
- Exposes a unified API for tracking events, page views, and user identification
- Ensures analytics only run when users have opted in

The analytics script is built as a standalone JavaScript bundle that can be included in any tldraw web application.

## Architecture

### Core components

**Analytics class** (`src/index.ts`)

- Main entry point that orchestrates all analytics services
- Manages consent state and enables/disables services accordingly
- Exposes global `window.tlanalytics` API with methods:
  - `identify(userId, properties)` - Identify a user across all services
  - `reset()` - Reset user identity across all services (called on logout)
  - `track(name, data)` - Track an event
  - `page()` - Track a page view
  - `gtag(...args)` - Access Google Analytics gtag function
  - `openPrivacySettings()` - Show privacy settings dialog

**Analytics services** (`src/analytics-services/`)

- Base `AnalyticsService` class defines common interface
- Each service (PostHog, GA4, HubSpot, Reo) extends the base class
- Lifecycle methods:
  - `initialize()` - Set up service (runs regardless of consent)
  - `enable()` - Enable tracking when consent is granted
  - `disable()` - Disable tracking when consent is revoked
  - `identify(userId, properties)` - Identify user
  - `reset()` - Reset user identity (called on logout)
  - `trackEvent(name, data)` - Track custom event
  - `trackPageview()` - Track page view

**State management** (`src/state/`)

- `AnalyticsState<T>` - Simple reactive state class with subscribe/notify pattern
- `CookieConsentState` - Manages consent state ('unknown' | 'opted-in' | 'opted-out')
- `ThemeState` - Manages theme for UI components ('light' | 'dark')

**UI components** (`src/components/`)

- `CookieConsentBanner` - Shows cookie consent prompt when consent is unknown
- `PrivacySettingsDialog` - Allows users to review and change their consent preferences

### Consent flow

1. On initialization, analytics reads consent from `allowTracking` cookie
2. If no existing consent decision:
   - Check user location via CloudFlare worker (`shouldRequireConsent()`)
   - Users in GDPR/LGPD regions default to 'unknown' (must opt in)
   - Users in other regions default to 'opted-in' (implicit consent)
3. If consent is unknown, banner is shown
4. User actions (accept/opt-out) update the consent state
5. Consent state changes trigger enable/disable on all services
6. Only opted-in users have their events tracked

**Geographic consent checking** (`src/utils/consent-check.ts`)

- Calls CloudFlare worker at `https://tldraw-consent.workers.dev`
- Worker uses `CF-IPCountry` header to determine user's country
- Requires explicit consent for EU, EEA, UK, Switzerland, Brazil
- Falls back to requiring consent if check fails or times out (2s timeout)
- Conservative default ensures compliance with privacy regulations

### Integration with services

**PostHog** (`src/analytics-services/posthog.ts`)

- Product analytics and session recording
- Switches between memory and localStorage persistence based on consent

**Google Analytics 4** (`src/analytics-services/ga4.ts`)

- Web analytics via gtag.js
- Measurement ID provided via `window.TL_GA4_MEASUREMENT_ID`

**HubSpot** (`src/analytics-services/hubspot.ts`)

- Marketing automation and CRM tracking
- Loaded via external script

**Reo** (`src/analytics-services/reo.ts`)

- Analytics service
- Loaded via external script

### CloudFlare consent worker

The consent worker is now maintained in a separate package at `apps/analytics-worker/`.

- Standalone CloudFlare Worker deployed to `tldraw-consent.workers.dev`
- Returns whether explicit consent is required based on user's geographic location
- Uses CloudFlare's `CF-IPCountry` header to detect country
- Returns JSON: `{ requires_consent: boolean, country_code: string }`
- CORS-enabled for cross-origin requests from tldraw domains
- Cached for 1 hour to reduce load
- Countries requiring explicit consent:
  - EU member states (GDPR)
  - EEA/EFTA countries (GDPR)
  - United Kingdom (UK PECR)
  - Switzerland (FADP)
  - Brazil (LGPD)

## Development

### Running the app

```bash
yarn dev              # Start development server
yarn build            # Build for production
yarn test             # Run tests
```

### Testing

Uses Vitest for unit testing. Test files are colocated with source files (e.g., `state.test.ts`).

### Build output

Vite builds the app into two outputs:

1. JavaScript bundle in `public/` directory (via `vite build --outDir public`)
2. TypeScript compiled output in `dist/` (via `tsc`)

The built script can be included in HTML via:

```html
<script src="/analytics.js"></script>
```

## Usage

After the script loads, use the global API:

```javascript
// Identify a user
window.tlanalytics.identify('user-123', { plan: 'pro' })

// Reset user identity (on logout)
window.tlanalytics.reset()

// Track an event
window.tlanalytics.track('button_clicked', { button: 'upgrade' })

// Track a page view
window.tlanalytics.page()

// Open privacy settings
window.tlanalytics.openPrivacySettings()
```

## Configuration

Analytics services are configured via constants in `src/constants.ts` and environment variables:

- `window.TL_GA4_MEASUREMENT_ID` - Google Analytics measurement ID
- `window.TL_GOOGLE_ADS_ID` - Google Ads ID (optional)
- PostHog, HubSpot, and Reo use hardcoded configuration in constants

## Key files

- `src/index.ts` - Main Analytics class and initialization
- `src/types.ts` - TypeScript types and global declarations
- `src/analytics-services/analytics-service.ts` - Base service class
- `src/analytics-services/*.ts` - Individual service implementations (PostHog, GA4, HubSpot, Reo)
- `src/state/state.ts` - Reactive state base class
- `src/state/cookie-consent-state.ts` - Consent management
- `src/state/theme-state.ts` - Theme management for UI components
- `src/utils/consent-check.ts` - Geographic consent checking utility
- `src/components/CookieConsentBanner.ts` - Consent banner UI
- `src/components/PrivacySettingsDialog.ts` - Privacy settings dialog UI
- `src/styles.css` - Component styles (inlined via Vite)

## Dependencies

- `posthog-js` - PostHog SDK
- `js-cookie` - Cookie management
- `vite` - Build tool
- `vitest` - Testing framework

## Notes

- This app does NOT use tldraw's `@tldraw/state` library - it has its own simple reactive state implementation
- The app is framework-agnostic - uses vanilla JavaScript/TypeScript
- All UI is created with vanilla DOM manipulation (no React)
- Styles are injected at runtime from the bundled CSS
- Services are enabled/disabled dynamically based on consent without page reload
- Error handling is implemented during initialization to prevent analytics failures from breaking the page
- User identity persists in memory during session for re-identification if consent changes
- Geographic consent checking uses a conservative approach - defaults to requiring consent on failure
