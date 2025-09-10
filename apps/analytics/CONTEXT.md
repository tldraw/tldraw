# @tldraw/analytics

The analytics app provides a privacy-compliant analytics tracking system for tldraw applications. It creates a standalone JavaScript library that can be embedded into websites to handle cookie consent, user tracking, and privacy settings.

## Purpose

This app builds a UMD (Universal Module Definition) library that provides:

- Cookie consent banner with opt-in/opt-out functionality
- Privacy settings dialog
- Integration with multiple analytics providers (PostHog, Google Analytics 4, HubSpot, Reo)
- GDPR-compliant tracking with user consent management

## Architecture

### Build System

- **Vite-based build**: Creates a single UMD library (`tl-analytics.js`)
- **React components**: Built with React 18 but bundled for standalone usage
- **CSS injection**: Styles are inlined and injected at runtime
- **External globals**: React and ReactDOM are expected as global dependencies

### Core Components

**Analytics.tsx** - Main analytics component

- Cookie consent banner with theme detection
- Consent state management using cookies
- Integration with multiple analytics providers
- Conditional loading of tracking scripts based on consent

**PrivacySettings.tsx** - Privacy settings dialog

- User-facing privacy controls
- Toggle analytics consent on/off
- Accessible dialog implementation using Radix UI

**index.ts** - Entry point and global API

- Exposes global `window.tlanalytics` object
- Provides functions: `page()`, `identify()`, `track()`, `gtag()`, `openPrivacySettings()`
- Handles DOM injection and component initialization

### Analytics Providers

**PostHog**

- Primary analytics provider
- Hosted at `https://analytics.tldraw.com/i`
- Memory-only persistence when consent is denied
- Full localStorage+cookie persistence when opted in

**Google Analytics 4**

- Configured via `window.TL_GA4_MEASUREMENT_ID`
- Supports Google Ads integration via `window.TL_GOOGLE_ADS_ID`
- Consent-aware configuration
- Anonymized IP when consent is denied

**HubSpot**

- Loaded conditionally with consent
- EU-hosted (js-eu1.hs-scripts.com)
- Account ID: 145620695

**Reo Analytics**

- User session recording and analytics
- Client ID: 47839e47a5ed202
- Conditional loading based on consent

## Development

### Scripts

- `yarn dev` - Start development server with Vite
- `yarn build` - Build UMD library to `public/tl-analytics.js`
- `yarn lint` - Run ESLint
- `yarn test` - Run Vitest (currently no tests)

### Dependencies

- **js-cookie**: Cookie management
- **posthog-js**: PostHog analytics client
- **radix-ui**: Accessible UI primitives for dialogs and switches
- **react-ga4**: Google Analytics 4 integration
- **react/react-dom**: UI framework

## Usage

The built library is designed to be included via script tag:

```html
<script src="path/to/tl-analytics.js"></script>
<script>
	// Optional: Set GA4 measurement ID
	window.TL_GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'

	// Track page view
	window.tlanalytics.page()

	// Identify user
	window.tlanalytics.identify('user-id', { name: 'User Name' })

	// Track custom event
	window.tlanalytics.track('button_click', { button_name: 'signup' })

	// Open privacy settings
	window.tlanalytics.openPrivacySettings()
</script>
```

## Privacy & Compliance

### Cookie Management

- Uses `allowTracking` cookie to store consent
- Three states: 'unknown', 'opted-in', 'opted-out'
- Consent banner appears only for 'unknown' state

### Data Collection

- **Without consent**: Anonymous, memory-only tracking
- **With consent**: Full tracking with persistent storage
- **GDPR compliance**: User can opt-out at any time via privacy settings

### Theme Support

- Automatic theme detection from document root styles
- Observes changes to `color-scheme` CSS property
- Applies appropriate styling for light/dark themes

## Deployment

The built library (`public/tl-analytics.js`) is deployed via Vercel configuration and can be hosted on CDN for inclusion in other tldraw applications and websites.
