# @internal/apps-script

This package contains the Google Apps Script configuration and build tooling for integrating tldraw as a Google Meet add-on.

## Purpose

Provides tldraw functionality within Google Meet through Google Apps Script add-ons, allowing users to collaborate on infinite canvas drawings during video calls.

## Architecture

### Core components

**appsscript.json** - Google Apps Script manifest

- Defines Meet add-on configuration with side panel and main stage URIs
- Configures OAuth scopes for Google services integration
- Sets up URL fetch whitelist for tldraw domains
- Uses placeholder `TLDRAW_HOST` replaced during build

**build-workspace-app.ts** - Build script

- Copies configuration to `dist/` directory
- Replaces `TLDRAW_HOST` placeholder with production/staging URLs
- Generates `.clasp.json` with appropriate Google Apps Script IDs
- Handles production vs staging environment configuration

### Build process

The build system:

1. Clears `dist/` directory
2. Copies `appsscript.json` to `dist/`
3. Replaces `TLDRAW_HOST` with environment-specific URL
4. Generates `.clasp.json` with correct script ID

### Environment configuration

**Production**: `https://www.tldraw.com`

- Script ID: `1FWcAvz7Rl4iPXQX3KmXm2mNG_RK2kryS7Bja8Y7RHvuAHnic51p_pqe7`

**Staging**: `https://staging.tldraw.com`

- Script ID: `1cJfZM0M_rGU-nYgG-4KR1DnERb7itkCsl1QmlqPxFvHnrz5n6Gfy8iht`

## Google Apps Script integration

### Add-on configuration

- **Side panel URI**: `/ts-side` - Compact tldraw interface for Meet sidebar
- **Main stage URI**: `/ts` - Full tldraw interface for screen sharing
- **Screen sharing support**: Enabled for presenting drawings to all participants

### OAuth scopes

Required permissions:

- User profile and email access
- Google Docs integration (current document only)
- External request capabilities for tldraw API calls
- Workspace link preview functionality

## Development workflow

### Setup commands

```bash
yarn glogin    # Login to Google Apps Script
yarn glogout   # Logout from Google Apps Script
yarn gcreate   # Create new Apps Script project
```

### Build & deploy

```bash
yarn build           # Build for production
yarn build:staging   # Build for staging
yarn gpush           # Deploy to production
yarn gpush:staging   # Deploy to staging
yarn gpull           # Pull from production
yarn gpull:staging   # Pull from staging
```

## Dependencies

- **@google/clasp**: Google Apps Script CLI tool for deployment
- **@types/google-apps-script**: TypeScript definitions for Apps Script APIs

## Integration points

This package connects tldraw with Google Meet by:

1. Providing Apps Script manifest configuration
2. Enabling tldraw URLs as trusted add-on origins
3. Supporting both sidebar and full-screen presentation modes
4. Handling authentication through Google's OAuth system

The actual tldraw functionality is served from the main tldraw.com application, with this package providing the Google Apps Script wrapper for Meet integration.
