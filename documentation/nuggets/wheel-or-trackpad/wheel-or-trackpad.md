---
title: Wheel or trackpad?
created_at: 12/20/2025
updated_at: 12/20/2025
keywords:
  - wheel
  - trackpad
  - scroll
  - input
  - mouse
  - detection
status: published
date: 12/20/2025
generation-notes: First draft.
order: 1
---

# Wheel or trackpad?

Mouse wheels and trackpads both fire wheel events, but users expect them to do opposite things. Scroll a mouse wheel and you expect to zoom. Two-finger swipe on a trackpad and you expect to pan. The browser doesn't tell you which device generated the event, so there's no way to automatically give users what they want. tldraw solves this by asking the user directly.

## The desired behaviors

The expectations are ingrained from decades of UI convention:

**Mouse wheel**: Scroll up to zoom in, scroll down to zoom out. The wheel is a discrete, clicky device—each notch should produce a visible zoom step. Users point at something and scroll to zoom in on it.

**Trackpad**: Two-finger swipe to pan the canvas in the swipe direction. Trackpads are continuous, gestural devices—they feel like dragging the canvas under your fingers. Zooming happens via pinch gestures, not scrolling.

These behaviors are essentially opposite. One scroll direction should move the camera, the other should change the zoom level. Getting it wrong makes the canvas feel broken—users scroll expecting to pan and instead zoom wildly off their target, or scroll expecting to zoom and the canvas drifts sideways.

## Why detection is impossible

The browser's wheel event looks identical regardless of source:

```typescript
interface WheelEvent {
	deltaX: number // Horizontal scroll amount
	deltaY: number // Vertical scroll amount
	deltaZ: number // Rarely used
	deltaMode: number // Units (pixels, lines, or pages)
	// ... inherited mouse event properties
}
```

Notice what's missing: any indication of what device generated the event. No `deviceType`, no `inputSource`, no `isTrackpad` property. The spec simply doesn't include this information.

Various heuristics have been attempted:

**Delta magnitude**: Mouse wheels tend to produce larger, more discrete deltas. Trackpads produce smoother, smaller deltas. But this varies wildly by OS settings, browser, and hardware. A high-sensitivity mouse wheel might produce smaller deltas than a low-sensitivity trackpad.

**Delta mode**: Mouse wheels sometimes use `DOM_DELTA_LINE` while trackpads use `DOM_DELTA_PIXEL`. But this is inconsistent—many configurations report pixel mode for both.

**Event frequency**: Trackpads fire events more frequently during a gesture. But momentum scrolling on trackpads can have large gaps, and some mouse wheels fire rapidly when spun quickly.

**Platform detection**: macOS laptops have trackpads, Windows desktops have mice. But MacBooks can have mice attached, Windows laptops have trackpads, and users might switch between devices mid-session.

None of these approaches work reliably across the full matrix of browsers, operating systems, hardware configurations, and user settings. Even if one worked today, OS or browser updates could break it tomorrow.

## The solution: ask the user

tldraw provides an input mode preference with three options:

```typescript
interface TLUserPreferences {
	// ...
	inputMode?: 'trackpad' | 'mouse' | null
}
```

The `null` value means "auto"—use whatever the camera options specify as the default wheel behavior. The explicit settings override the default:

```typescript
// In the wheel event handler
let wheelBehavior = cameraOptions.wheelBehavior
const inputMode = this.user.getUserPreferences().inputMode

// If the user has set their input mode preference, use it
if (inputMode !== null) {
	wheelBehavior = inputMode === 'trackpad' ? 'pan' : 'zoom'
}
```

The preference is exposed in the help menu as a submenu with three checkbox options: Auto, Trackpad, and Mouse. Once set, it persists in localStorage and syncs across tabs via BroadcastChannel.

## The ctrl key escape hatch

Even with the correct preference set, users sometimes need the opposite behavior. Holding ctrl inverts the wheel action:

```typescript
let behavior = wheelBehavior

// If "zoom" and ctrl pressed, pan instead
// If "pan" and ctrl pressed, zoom instead
if (info.ctrlKey) behavior = wheelBehavior === 'pan' ? 'zoom' : 'pan'

switch (behavior) {
	case 'zoom': {
		// Zoom at cursor position
		const { x, y } = this.inputs.getCurrentScreenPoint()
		// ...
	}
	case 'pan': {
		// Pan by scroll delta
		// ...
	}
}
```

This lets trackpad users zoom without switching preferences, and mouse users pan without switching. It's an interaction pattern familiar from other canvas applications.

## Zoom calculation differences

Mouse wheel zooming and trackpad-initiated zooming calculate zoom levels differently:

```typescript
case 'zoom': {
  let delta = dz

  // Mouse wheel mode needs special delta handling
  if (wheelBehavior === 'zoom') {
    if (Math.abs(dy) > 10) {
      delta = (10 * Math.sign(dy)) / 100
    } else {
      delta = dy / 100
    }
  }

  const zoom = cz + (delta ?? 0) * zoomSpeed * cz
  // ...
}
```

When the wheel behavior is explicitly set to zoom (mouse mode), the vertical scroll delta gets clamped and scaled. Without this, a quick mouse wheel flick would produce massive zoom jumps. The threshold and scaling values (10 and 100) were tuned to match the discrete, clicky feel of mouse wheels—each notch produces a visible but controlled zoom step.

Trackpad zooming, by contrast, uses the pinch gesture's `dz` value directly, which has already been normalized for smooth, continuous zooming.

## Why not detect per-event?

Some applications try to detect device type on each event and switch behavior dynamically. This approach has problems beyond detection unreliability:

**User confusion**: If the detection gets it wrong even occasionally, the canvas behaves unpredictably. Users can't develop muscle memory when the same gesture sometimes pans and sometimes zooms.

**Mode switches**: Users with both devices (laptop with external mouse) would experience jarring behavior changes as they switch inputs. A consistent preference lets them choose which device's behavior to prioritize.

**Explicit is better than implicit**: When something as fundamental as scroll behavior depends on heuristics, users lose trust. An explicit preference puts users in control and eliminates the "why did it do that?" moments.

## The preference UI

The InputModeMenu component renders three radio-style options:

```typescript
const MODES = ['auto', 'trackpad', 'mouse'] as const

// ...

<TldrawUiMenuSubmenu id="help menu input-mode" label="menu.input-mode">
  <TldrawUiMenuGroup id="peripheral-mode">
    {MODES.map((mode) => (
      <TldrawUiMenuCheckboxItem
        id={`peripheral-mode-${mode}`}
        key={mode}
        label={getLabel(mode, wheelBehavior)}
        checked={isModeChecked(mode)}
        onSelect={() => {
          switch (mode) {
            case 'auto':
              editor.user.updateUserPreferences({ inputMode: null })
              break
            case 'trackpad':
              editor.user.updateUserPreferences({ inputMode: 'trackpad' })
              break
            case 'mouse':
              editor.user.updateUserPreferences({ inputMode: 'mouse' })
              break
          }
        }}
      />
    ))}
  </TldrawUiMenuGroup>
</TldrawUiMenuSubmenu>
```

The labels are internationalized, so they adapt to the user's locale. Analytics track which mode users select, helping us understand the distribution of input devices among users.

## Accepting the limits of the web platform

This solution acknowledges a fundamental limitation: the web platform doesn't expose input device information. Rather than fighting this with fragile heuristics, tldraw embraces explicit user preference.

The tradeoff is onboarding friction. New users who scroll and get the wrong behavior have to discover the preference and change it. But the alternative—unreliable automatic detection—creates ongoing friction. A one-time preference change beats repeated unpredictable behavior.

Browser vendors could solve this properly by adding device information to wheel events. Until then, asking users beats guessing.

## Key files

- `packages/editor/src/lib/editor/Editor.ts:10417-10480` — Wheel event handling and behavior switching
- `packages/editor/src/lib/config/TLUserPreferences.ts` — inputMode preference definition
- `packages/tldraw/src/lib/ui/components/InputModeMenu.tsx` — Preference UI

## Related

- [Pinch gesture disambiguation](./pinch-gesture.md) — How two-finger trackpad gestures distinguish zoom from pan
- [Wheel momentum filtering](./wheel-momentum.md) — Filtering phantom scroll events from momentum decay
