# Analytics app context

## Overview

The `@tldraw/analytics` package is a standalone analytics service built as a UMD library for tracking user behavior with GDPR-compliant cookie consent management. It provides a unified interface for multiple analytics providers and integrates seamlessly with tldraw.com and related applications.

**Purpose:** Provide centralized analytics tracking with cookie consent management for tldraw web properties.

**Build target:** UMD library (browser-ready with global `window.tlanalytics` API)
**Framework:** Vanilla JavaScript (no React dependency)
**Build tool:** Vite
**Analytics providers:** PostHog, Google Analytics 4, HubSpot, REO

## Architecture

### Core components

#### `analytics.ts` - Main analytics orchestration

Central coordination layer for all analytics services:

```typescript
// Manages analytics state and consent
- ensureAnalyticsConfigured(): Initializes all services
- enableAnalytics(): Activates tracking when consent is granted
- disableAnalytics(): Deactivates tracking when consent is revoked
- page(): Track pageviews across all services
- identify(userId, properties): Identify users
- track(name, data): Track events
- gtag(...args): Direct access to Google Analytics gtag
- applyConsent(consent): Handle consent state changes
```

**In-memory state:**
- User ID and properties preserved for replay after consent
- Consent state tracked separately from cookie storage
- Services initialized once, then enabled/disabled based on consent

#### `index.ts` - Library entry point

Browser integration layer:

```typescript
// Injects styles and mounts UI components
- Loads inline CSS for consent banner and dialogs
- Auto-mounts cookie consent banner on initialization
- Exposes window.tlanalytics global API:
  - openPrivacySettings(): Open privacy preferences dialog
  - page(), identify(), track(), gtag(): Analytics methods
```

### Service architecture

#### `AnalyticsService` base class

Abstract base class defining service interface:

```typescript
class AnalyticsService {
  initialize(): void       // Set up service (runs regardless of consent)
  enable(): void          // Activate tracking (consent granted)
  disable(): void         // Deactivate tracking (consent revoked)
  identify(userId, props) // Identify user
  trackEvent(name, data)  // Track custom event
  trackPageview()         // Track page view
}
```

#### Analytics service implementations

**PostHog (`services/posthog.ts`)**
- Primary analytics platform for tldraw.com
- Feature flags and A/B testing support
- Session recording and heatmaps
- Initialization with project API key from environment

**Google Analytics 4 (`services/ga4.ts`)**
- Traditional web analytics and reporting
- Custom events with data layer integration
- Direct gtag access for advanced use cases
- Exports both GA service and raw gtag function

**HubSpot (`services/hubspot.ts`)**
- Marketing automation and CRM integration
- Lead tracking and attribution
- Form submission tracking
- Cookie-based visitor identification

**REO (`services/reo.ts`)**
- Additional analytics provider
- Event tracking and user identification
- Integration with tldraw marketing funnel

### State management

#### `AnalyticsState<T>` - Reactive state container

Lightweight reactive state management without dependencies:

```typescript
class AnalyticsState<T> {
  protected value: T
  protected listeners: Set<(value: T) => void>

  subscribe(listener): Unsubscribe function
  notify(): Triggers all listeners
  getValue(): Returns current value
  setValue(value): Updates and notifies
  initialize(): One-time setup logic
  dispose(): Cleanup logic
}
```

**Pattern:**
- Observable state without external dependencies
- Simple pub/sub for component updates
- Lifecycle methods for stateful initialization

#### State implementations

**Cookie consent state (`state/cookie-consent-state.ts`)**
- Manages user consent choice: 'unknown' | 'opted-in' | 'opted-out'
- Persists to cookies with js-cookie library
- Automatically syncs consent to analytics services
- One-year cookie expiration with SameSite=Lax

**Theme state (`state/theme-state.ts`)**
- Detects and tracks light/dark theme preference
- Watches data-color-scheme attribute on document element
- Updates UI components when theme changes
- MutationObserver for runtime theme switching

### UI components

#### `CookieConsentBanner.ts` - Initial consent prompt

Cookie consent banner displayed on first visit:

**Features:**
- Only shown when consent status is 'unknown'
- Two-button interface: "Opt out" and "Accept all"
- Link to cookie policy documentation
- Theme-aware styling via data-theme attribute
- Auto-removal when consent is given

**Lifecycle:**
- Initializes cookie consent and theme states
- Returns null if consent already provided
- Creates vanilla JS DOM elements with event listeners
- Subscribes to state changes for reactivity
- Cleanup on removal (unsubscribes from state)

**Implementation pattern:**
```typescript
createCookieConsentBanner(): HTMLElement | null
  - Check existing consent
  - Create DOM structure with innerHTML
  - Attach event listeners for buttons
  - Subscribe to state changes
  - Return banner element or null

mountCookieConsentBanner(container): Auto-mount helper
  - Removes existing banner if present
  - Appends to container (default: document.body)
```

#### `PrivacySettingsDialog.ts` - Preference management

Privacy settings dialog for updating consent preferences:

**Features:**
- Modal dialog for changing cookie preferences
- "Opt out" and "Accept all" options
- Theme-aware with backdrop overlay
- Focus trap for accessibility
- Escape key to close

**Lifecycle:**
- Initializes theme state for styling
- Creates modal with backdrop and dialog structure
- Manages focus and keyboard interactions
- Removes from DOM when closed

**Implementation pattern:**
```typescript
createPrivacySettingsDialog(): HTMLElement
  - Create modal overlay with dialog
  - Set up event handlers for close actions
  - Subscribe to theme changes
  - Cleanup on removal

mountPrivacySettingsDialog(container): Auto-mount helper
  - Removes existing dialog if present
  - Appends to container (default: document.body)
```

### Constants and configuration

#### `constants.ts` - Environment configuration

Centralized configuration values:

- `DOT_DEV_COOKIE_POLICY_URL`: Link to cookie policy documentation
- `CONSENT_COOKIE_NAME`: Cookie name for storing consent preference
- Service API keys and environment-specific values
- Feature flags and configuration toggles

### Type definitions

#### `types.ts` - Shared type definitions

**CookieConsent type:**
```typescript
type CookieConsent = 'unknown' | 'opted-in' | 'opted-out'
```

**Global window API:**
```typescript
declare global {
  interface Window {
    tlanalytics: {
      openPrivacySettings(): void
      page(): void
      identify(userId: string, properties?: object): void
      track(name: string, data?: object): void
      gtag(...args: any[]): void
    }
  }
}
```

## Key patterns

### Service lifecycle management

**Three-phase initialization:**

1. **Configure phase**: Services initialize regardless of consent
   - Load service scripts and libraries
   - Set up configurations
   - Prepare for activation (no tracking yet)

2. **Enable phase**: Activate when consent is granted
   - Start tracking events
   - Replay buffered identify() calls
   - Enable active monitoring

3. **Disable phase**: Deactivate when consent is revoked
   - Stop tracking new events
   - Clear user identification
   - Respect privacy preferences

### State synchronization

**Cookie consent flow:**

```
1. User loads page
   ↓
2. cookieConsentState.initialize() reads cookie
   ↓
3. If unknown → show banner
   If opted-in → enable analytics
   If opted-out → disable analytics
   ↓
4. User makes choice
   ↓
5. cookieConsentState.setValue(choice)
   ↓
6. State notifies subscribers
   ↓
7. Cookie is saved (1 year expiration)
   ↓
8. applyConsent(choice) updates analytics services
   ↓
9. Banner/dialog removed from DOM
```

### Vanilla JS component pattern

**Component lifecycle:**

```typescript
// 1. Create component function
export function createComponent(): HTMLElement | null {
  // Initialize required state
  const state = someState.initialize()

  // Conditionally render or create DOM
  const element = document.createElement('div')
  element.innerHTML = `...`

  // Attach event listeners
  element.addEventListener('click', handler)

  // Subscribe to state changes
  const cleanup = state.subscribe(value => {
    // Update DOM or remove element
  })

  // Override remove for cleanup
  const originalRemove = element.remove.bind(element)
  element.remove = function() {
    originalRemove()
    cleanup()
  }

  return element
}

// 2. Mount helper for easy integration
export function mountComponent(container = document.body): HTMLElement | null {
  // Remove existing instance
  const existing = document.querySelector('.component')
  if (existing) existing.remove()

  // Create and append
  const component = createComponent()
  if (component) container.appendChild(component)

  return component
}
```

### Consent-aware tracking

**Buffering pattern:**

```typescript
// Store user info in memory
const inMemoryState = {
  userId: '',
  properties: {},
  hasConsent: 'unknown'
}

// Buffer identify calls
function identify(userId, properties) {
  inMemoryState.userId = userId
  inMemoryState.properties = properties

  // Only send if consent granted
  if (inMemoryState.hasConsent === 'opted-in') {
    services.forEach(s => s.identify(userId, properties))
  }
}

// Replay buffered data when enabled
function enableAnalytics() {
  services.forEach(s => s.enable())

  // Replay buffered identify
  if (inMemoryState.userId) {
    identify(inMemoryState.userId, inMemoryState.properties)
  }
}
```

## Integration

### Browser integration

**Script tag integration:**

```html
<!-- UMD build loaded as script -->
<script src="https://example.com/analytics.js"></script>

<script>
  // Global API available immediately
  window.tlanalytics.page()
  window.tlanalytics.identify('user123', { plan: 'pro' })
  window.tlanalytics.track('feature_used', { feature: 'export' })

  // Open privacy settings manually
  window.tlanalytics.openPrivacySettings()
</script>
```

**Automatic features:**
- Styles injected automatically (inline CSS)
- Cookie consent banner auto-mounted to document.body
- Theme detection from document.documentElement data-color-scheme

### Usage in tldraw.com

**Client app integration:**

```typescript
// Track page navigation
window.tlanalytics.page()

// Identify authenticated users
window.tlanalytics.identify(user.id, {
  email: user.email,
  plan: user.subscription.plan,
  createdAt: user.createdAt
})

// Track feature usage
window.tlanalytics.track('document_created', {
  documentType: 'whiteboard',
  collaborators: 3
})

// Manual privacy settings access
<button onClick={() => window.tlanalytics.openPrivacySettings()}>
  Privacy Settings
</button>
```

### Theme integration

**Automatic theme detection:**

```html
<!-- Analytics detects theme from this attribute -->
<html data-color-scheme="dark">
  <!-- Components styled based on detected theme -->
</html>
```

**Theme state updates:**
- MutationObserver watches data-color-scheme changes
- All mounted components receive theme updates
- Components re-render with appropriate theme styles

## Development

### Development workflow

**Local development:**

```bash
# Start dev server with hot reload
yarn dev

# Build UMD library
yarn build

# Type checking
yarn typecheck

# Linting
yarn lint
```

**Testing integration:**

```html
<!DOCTYPE html>
<html data-color-scheme="light">
<head>
  <script src="/src/index.ts" type="module"></script>
</head>
<body>
  <!-- Cookie banner auto-mounted -->
  <script>
    // Test analytics API
    setTimeout(() => {
      window.tlanalytics.page()
      window.tlanalytics.identify('test-user', { role: 'developer' })
      window.tlanalytics.track('test_event', { context: 'dev' })
    }, 1000)
  </script>
</body>
</html>
```

### Build output

**Vite configuration:**
- Output directory: `public/` (not typical `dist/`)
- Format: UMD with global name `tlanalytics`
- CSS: Inlined as string (no external stylesheet)
- TypeScript: Compiled to JavaScript with type definitions

### Environment configuration

**Service API keys:**
- PostHog: Project API key and host URL
- Google Analytics: Measurement ID (G-XXXXXXXXXX)
- HubSpot: Portal ID and script version
- REO: Service endpoint and credentials

**Configuration sources:**
- Environment variables (build-time)
- Runtime constants in `constants.ts`
- Service-specific initialization options

## Performance considerations

### Bundle optimization

**Code splitting:**
- Services loaded lazily when analytics configured
- UI components only mounted when needed
- Inline CSS eliminates external stylesheet request

**Runtime efficiency:**
- Services initialized once, then enabled/disabled
- State subscriptions cleaned up on component removal
- Event listeners properly removed
- MutationObserver disconnected when not needed

### Privacy and compliance

**GDPR compliance:**
- No tracking before explicit consent
- Clear opt-out mechanism
- Cookie policy link in consent banner
- User preferences persisted and respected
- Services disabled completely when opted out

**Data minimization:**
- Only essential cookies set
- User data buffered in memory (not persisted until consent)
- Analytics services receive minimal necessary data
- No fingerprinting or tracking workarounds

## Styling

### CSS architecture

**Inline styles:**
- All styles bundled as inline string (imported from `styles.css?inline`)
- Injected into `<style>` tag at initialization
- No external CSS file required

**Theme support:**
- Components use `data-theme="light|dark"` attribute
- CSS custom properties for theme-specific values
- Automatic updates when theme changes

**Component classes:**
- `.tl-analytics-banner`: Cookie consent banner
- `.tl-analytics-dialog`: Privacy settings dialog
- `.tl-analytics-button`: Themed button component
- `.tl-analytics-backdrop`: Modal overlay

### Responsive design

**Mobile considerations:**
- Banner positioned at bottom for mobile accessibility
- Touch-friendly button sizes
- Readable text sizes on small screens
- Modal dialog adapts to viewport size

## Testing patterns

### Manual testing

**Cookie consent flow:**
1. Clear cookies and reload
2. Verify banner appears
3. Click "Opt out" → verify tracking disabled
4. Open privacy settings → change to "Accept all"
5. Verify tracking enabled and identify() replayed

**Theme switching:**
1. Toggle theme in host application
2. Verify banner and dialog update immediately
3. Check both light and dark themes render correctly

**Service verification:**
1. Open browser dev tools → Network tab
2. Accept cookies
3. Verify service initialization requests (PostHog, GA, etc.)
4. Track test event → verify in service dashboards

### Integration testing

**With tldraw.com:**
- Load app and verify banner appears (first visit)
- Authenticate and verify identify() called with user data
- Navigate pages and verify page() tracking
- Interact with features and verify track() events
- Check analytics dashboards for received data

## Future considerations

### Potential improvements

**Enhanced functionality:**
- Granular consent (separate functional/analytics/marketing cookies)
- Cookie preferences UI with toggle switches per provider
- Analytics events queue with retry logic
- Service health monitoring and fallbacks

**Developer experience:**
- TypeScript types for event names and properties
- Event validation and schema enforcement
- Debug mode for development environments
- Analytics testing utilities

**Compliance:**
- Regional consent management (GDPR, CCPA, etc.)
- Consent banner localization
- Automatic consent logging for audit trails
- Integration with consent management platforms (CMPs)
