---
title: Environment detection
created_at: 12/22/2024
updated_at: 12/22/2024
keywords:
  - environment
  - browser
  - platform
  - tlenv
  - Safari
  - iOS
  - Android
  - Firefox
  - coarse pointer
reviewed_by: steveruizok
status: published
date: 12/22/2024
order: 11
---

We export two objects for environment detection: `tlenv` for static browser/platform info, and `tlenvReactive` for values that change during a session. We use these internally to work around browser quirks, and you can use them for the same purpose in custom shapes or tools.

## Static environment: tlenv

The `tlenv` object contains fixed values detected at load time. These don't change during a session.

```typescript
import { tlenv } from 'tldraw'

// Browser detection
tlenv.isSafari // true if Safari (excluding Chrome on iOS)
tlenv.isFirefox // true if Firefox
tlenv.isChromeForIos // true if Chrome running on iOS

// Platform detection
tlenv.isIos // true if iPad or iPhone
tlenv.isAndroid // true if Android device
tlenv.isDarwin // true if macOS (used for keyboard shortcuts)
tlenv.isWebview // true if running in a webview

// Capability detection
tlenv.hasCanvasSupport // true if Promise and HTMLCanvasElement exist
```

### Common usage patterns

**Platform-specific keyboard shortcuts:**

```typescript
// Use Cmd on Mac, Ctrl elsewhere
const accelKey = tlenv.isDarwin ? e.metaKey : e.ctrlKey
```

**Mobile detection:**

```typescript
const isMobile = tlenv.isIos || tlenv.isAndroid
if (isMobile) {
	// Adjust UI for touch
}
```

**Safari workarounds:**

```typescript
// Safari needs extra time for SVG image export
if (tlenv.isSafari) {
	await sleep(250)
}
```

## Reactive environment: tlenvReactive

The `tlenvReactive` atom contains values that can change during a session, such as the pointer type. Use this with reactive hooks to respond to changes.

```typescript
import { tlenvReactive } from 'tldraw'
import { useValue } from '@tldraw/state-react'

function MyComponent() {
  const { isCoarsePointer } = useValue(tlenvReactive)

  return (
    <div style={{ padding: isCoarsePointer ? 16 : 8 }}>
      {/* Larger touch targets for touch input */}
    </div>
  )
}
```

### Coarse pointer detection

The `isCoarsePointer` value tracks whether the user is currently using touch input. We update it in two ways: by listening to the `(any-pointer: coarse)` media query, and by checking the `pointerType` on each pointer event. This dual approach handles devices that support both mouse and touch—like laptops with touchscreens—where the user might switch input methods mid-session.

```typescript
// Access reactively
const isCoarse = tlenvReactive.get().isCoarsePointer

// Or subscribe to changes
react('pointer type changed', () => {
	const { isCoarsePointer } = tlenvReactive.get()
	console.log('Coarse pointer:', isCoarsePointer)
})
```

Note: Firefox desktop forces fine pointer mode regardless of the actual input device, as its coarse pointer reporting is unreliable.

## Browser quirks we handle

Here's a sample of what we use environment detection for internally:

Safari has the most workarounds. SVG-to-image export fails silently unless we add a 250ms delay after loading the image—a WebKit bug that's been open for years. We also double-draw minimap triangles because Safari's WebGL implementation sometimes drops the first draw call. Text outlines render incorrectly, so we disable them.

On iOS, coalesced pointer events are broken (they report wrong coordinates), so we skip them entirely and use individual events. We also handle the virtual keyboard differently since iOS doesn't fire standard resize events.

Firefox's `(any-pointer: coarse)` media query reports false positives on desktop when a touchscreen is present but not in use. We force fine pointer mode on Firefox desktop to avoid jumpy UI.

Chrome for iOS has its own print implementation that doesn't trigger the standard `beforeprint` event, so we detect it and handle printing manually.
