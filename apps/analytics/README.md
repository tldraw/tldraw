# Tldraw Analytics

This package provides standardized analytics tracking for tldraw applications with automatic custom dimensions and consistent event naming.

## Event Naming Conventions

We use a standardized naming convention for all analytics events:

### Naming Pattern
- **Format**: `category.action` or `category.subcategory.action`
- **Case**: `snake_case` for all event names and properties
- **Actions**: Use past tense verbs (`clicked`, `opened`, `created`, `exported`)
- **Specificity**: Be specific but concise (`file.created` not `create-file`)

### Event Categories

- **`page.*`** - Page and navigation events
- **`file.*`** - File operations (create, rename, download, share, publish)
- **`editor.*`** - Editor-specific actions (edit started, tools selected)
- **`shapes.*`** - Shape operations (duplicate, group, align)
- **`content.*`** - Content operations (export, copy)
- **`menu.*`** - UI menu interactions
- **`docs.*`** - Documentation site specific events
- **`conversion.*`** - Marketing conversion events
- **`performance.*`** - Performance tracking events
- **`error.*`** - Error tracking events

## Custom Dimensions

All events automatically include these custom dimensions:

- **`source`** - Where the action originated (required)
- **`app_context`** - Which app: `docs`, `dotcom`, `vscode`, `examples`
- **`user_type`** - `anonymous` or `signed_in`
- **`timestamp`** - Unix timestamp when event occurred

## Usage

### Basic Event Tracking

```typescript
import { track } from './analytics'

// Standard event with required source
track('file.created', { source: 'new_page' })

// Event with additional data
track('content.exported', { 
  source: 'toolbar', 
  format: 'png' 
})
```

### Page View Tracking

```typescript
import { page } from './analytics'

// Standardized page view (includes custom dimensions automatically)
page()
```

### Type-Safe Event Tracking

```typescript
import type { TldrawEvents, TldrawEventName } from './events'

// Use the standardized event types for type safety
function trackFileAction(action: 'created' | 'renamed' | 'deleted') {
  track(`file.${action}` as TldrawEventName, { source: 'menu' })
}
```

## Migration Guide

When updating existing events to use the new standardized naming:

### Before (Inconsistent)
```typescript
track('create-file', { source: 'new-page' })
track('copy-share-link', { source: 'file-share-menu' })
track('room_load_duration', { duration_ms: 1200 })
track('docs.copy.code-block', { isInstall: true })
```

### After (Standardized)
```typescript
track('file.created', { source: 'new_page' })
track('file.share_link_copied', { source: 'file_share_menu' })
track('performance.room_load_duration', { duration_ms: 1200, source: 'room' })
track('docs.code_copied', { is_install: true, source: 'docs' })
```

## Event Reference

See `events.ts` for the complete list of standardized events and their expected properties.

### Key Changes from Legacy Events

- `create-file` → `file.created`
- `open-url` → `url.opened` 
- `copy-share-link` → `file.share_link_copied`
- `room_load_duration` → `performance.room_load_duration`
- `docs.copy.code-block` → `docs.code_copied`
- `$pageview` → `page.viewed`

## Implementation

The analytics package automatically:

1. **Enriches all events** with custom dimensions
2. **Sends to multiple services** (PostHog, Google Analytics)
3. **Handles consent** and privacy settings
4. **Provides type safety** with TypeScript definitions

Events are sent to both PostHog and Google Analytics with consistent naming and custom dimensions for comprehensive analytics coverage.