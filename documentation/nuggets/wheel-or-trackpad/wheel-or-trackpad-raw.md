---
title: Wheel or trackpad - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - wheel
  - or
  - trackpad
status: published
date: 12/21/2025
order: 0
---

# Wheel or trackpad: raw notes

Internal research notes for the wheel-or-trackpad.md article.

## Core problem

Browser wheel events look identical whether they come from a mouse wheel or trackpad, but users expect opposite behaviors:

- **Mouse wheel**: scroll up/down = zoom in/out
- **Trackpad**: two-finger swipe = pan (zoom happens via pinch gestures)

The `WheelEvent` API provides no device information, and all detection heuristics are unreliable.

## Browser WheelEvent API limitations

From the DOM spec, the `WheelEvent` interface contains:

```typescript
interface WheelEvent extends MouseEvent {
	deltaX: number // Horizontal scroll amount
	deltaY: number // Vertical scroll amount
	deltaZ: number // Rarely used (depth scrolling)
	deltaMode: number // 0 = DOM_DELTA_PIXEL, 1 = DOM_DELTA_LINE, 2 = DOM_DELTA_PAGE
}
```

**Missing information:**

- No `deviceType` or `inputSource` field
- No `isTrackpad` boolean
- No reliable way to distinguish input hardware

## Failed detection heuristics

**Delta magnitude approach:**

- Mouse wheels typically produce discrete, larger deltas (e.g., 100+ pixels per notch)
- Trackpads produce smoother, smaller deltas (e.g., 1-10 pixels per frame)
- **Problem**: OS settings, browser scaling, and hardware sensitivity vary wildly
- High-sensitivity mouse can match trackpad deltas
- Low-sensitivity trackpad can produce large jumps

**Delta mode approach:**

- `DOM_DELTA_LINE` (mode 1) more common with mouse wheels
- `DOM_DELTA_PIXEL` (mode 0) more common with trackpads
- **Problem**: Inconsistent across browsers and configurations
- Modern browsers often normalize everything to pixel mode
- Not reliable for detection

**Event frequency approach:**

- Trackpads fire many events during continuous gesture
- Mouse wheels fire discrete events per notch
- **Problem**: Momentum scrolling on trackpads has gaps
- Fast mouse wheel spinning produces rapid bursts
- Overlap between devices too large

**Platform detection approach:**

- Assume macOS laptops = trackpad, Windows desktops = mouse
- **Problem**: Users can have both devices
- Laptops can have external mice
- Desktop users may have trackpads or touch devices
- Device can change mid-session without page reload

## Solution: explicit user preference

Located in `packages/editor/src/lib/config/TLUserPreferences.ts:13-29`:

```typescript
export interface TLUserPreferences {
	id: string
	name?: string | null
	color?: string | null
	locale?: string | null
	animationSpeed?: number | null
	areKeyboardShortcutsEnabled?: boolean | null
	edgeScrollSpeed?: number | null
	colorScheme?: 'light' | 'dark' | 'system'
	isSnapMode?: boolean | null
	isWrapMode?: boolean | null
	isDynamicSizeMode?: boolean | null
	isPasteAtCursorMode?: boolean | null
	enhancedA11yMode?: boolean | null
	inputMode?: 'trackpad' | 'mouse' | null // null = "auto"
}
```

**Input mode values:**

- `'trackpad'`: Force pan-on-wheel behavior
- `'mouse'`: Force zoom-on-wheel behavior
- `null`: Use default from camera options (auto mode)

**Validator:**
From `TLUserPreferences.ts:43-59`:

```typescript
export const userTypeValidator: T.Validator<TLUserPreferences> = T.object<TLUserPreferences>({
	// ... other fields
	inputMode: T.literalEnum('trackpad', 'mouse').nullable().optional(),
})
```

## Migration and versioning

From `TLUserPreferences.ts:61-74`:

```typescript
const Versions = {
	AddAnimationSpeed: 1,
	AddIsSnapMode: 2,
	MakeFieldsNullable: 3,
	AddEdgeScrollSpeed: 4,
	AddExcalidrawSelectMode: 5,
	AddDynamicSizeMode: 6,
	AllowSystemColorScheme: 7,
	AddPasteAtCursor: 8,
	AddKeyboardShortcuts: 9,
	AddShowUiLabels: 10,
	AddPointerPeripheral: 11, // When inputMode was added
	RenameShowUiLabelsToEnhancedA11yMode: 12,
} as const
```

From `TLUserPreferences.ts:120-122`:

```typescript
if (data.version < Versions.AddPointerPeripheral) {
	data.user.inputMode = null
}
```

The `inputMode` field was added in version 11 (AddPointerPeripheral). Older user data migrates with `inputMode: null` (auto behavior).

## Default values

From `TLUserPreferences.ts:158-174`:

```typescript
export const defaultUserPreferences = Object.freeze({
	name: '',
	locale: getDefaultTranslationLocale(),
	color: getRandomColor(),
	edgeScrollSpeed: 1,
	animationSpeed: userPrefersReducedMotion() ? 0 : 1,
	areKeyboardShortcutsEnabled: true,
	isSnapMode: false,
	isWrapMode: false,
	isDynamicSizeMode: false,
	isPasteAtCursorMode: false,
	enhancedA11yMode: false,
	colorScheme: 'light',
	inputMode: null, // Default to "auto"
}) satisfies Readonly<Omit<TLUserPreferences, 'id'>>
```

## Preference persistence

**LocalStorage:**
From `TLUserPreferences.ts:6`:

```typescript
const USER_DATA_KEY = 'TLDRAW_USER_DATA_v3'
```

From `TLUserPreferences.ts:213-221`:

```typescript
function storeUserPreferences() {
	setInLocalStorage(
		USER_DATA_KEY,
		JSON.stringify({
			version: CURRENT_VERSION,
			user: globalUserPreferences.get(),
		})
	)
}
```

**BroadcastChannel synchronization:**
From `TLUserPreferences.ts:233-243`:

```typescript
const channel =
	typeof BroadcastChannel !== 'undefined' && !isTest
		? new BroadcastChannel('tldraw-user-sync')
		: null

channel?.addEventListener('message', (e) => {
	const data = e.data as undefined | UserChangeBroadcastMessage
	if (data?.type === broadcastEventKey && data?.origin !== getBroadcastOrigin()) {
		globalUserPreferences.set(migrateUserPreferences(data.data))
	}
})
```

**Message format:**
From `TLUserPreferences.ts:36-40`:

```typescript
interface UserChangeBroadcastMessage {
	type: typeof broadcastEventKey // 'tldraw-user-preferences-change'
	origin: string // unique ID to prevent echo
	data: UserDataSnapshot
}
```

Preferences sync across browser tabs/windows using `BroadcastChannel`. Each tab has unique origin ID to ignore its own broadcasts.

## Camera options

From `packages/editor/src/lib/editor/types/misc-types.ts:93-111`:

```typescript
export interface TLCameraOptions {
	isLocked: boolean
	panSpeed: number // Default: 1
	zoomSpeed: number // Default: 1
	zoomSteps: number[] // Default: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8]
	wheelBehavior: 'zoom' | 'pan' | 'none'
	constraints?: TLCameraConstraints
}
```

From `packages/editor/src/lib/constants.ts:5-11`:

```typescript
export const DEFAULT_CAMERA_OPTIONS: TLCameraOptions = {
	isLocked: false,
	wheelBehavior: 'pan', // Default assumes trackpad-like behavior
	panSpeed: 1,
	zoomSpeed: 1,
	zoomSteps: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8],
}
```

**Default is 'pan'** because trackpad is more common on modern laptops, and panning feels like the "natural" default for a canvas application (matches tools like Figma, Miro, etc.).

## Wheel event handler implementation

From `packages/editor/src/lib/editor/Editor.ts:10417-10480`:

```typescript
case 'wheel': {
  if (cameraOptions.isLocked) return

  this.inputs.updateFromEvent(info)

  const { panSpeed, zoomSpeed } = cameraOptions
  let wheelBehavior = cameraOptions.wheelBehavior
  const inputMode = this.user.getUserPreferences().inputMode

  // If the user has set their input mode preference, then use that to determine the wheel behavior
  if (inputMode !== null) {
    wheelBehavior = inputMode === 'trackpad' ? 'pan' : 'zoom'
  }

  if (wheelBehavior !== 'none') {
    // Stop any camera animation
    this.stopCameraAnimation()
    // Stop following any following user
    if (instanceState.followingUserId) {
      this.stopFollowingUser()
    }

    const { x: cx, y: cy, z: cz } = unsafe__withoutCapture(() => this.getCamera())
    const { x: dx, y: dy, z: dz = 0 } = info.delta

    let behavior = wheelBehavior

    // If the camera behavior is "zoom" and the ctrl key is pressed, then pan;
    // If the camera behavior is "pan" and the ctrl key is not pressed, then zoom
    if (info.ctrlKey) behavior = wheelBehavior === 'pan' ? 'zoom' : 'pan'

    switch (behavior) {
      case 'zoom': {
        // Zoom in on current screen point using the wheel delta
        const { x, y } = this.inputs.getCurrentScreenPoint()
        let delta = dz

        // If we're forcing zoom, then we need to do the wheel normalization math here
        if (wheelBehavior === 'zoom') {
          if (Math.abs(dy) > 10) {
            delta = (10 * Math.sign(dy)) / 100
          } else {
            delta = dy / 100
          }
        }

        const zoom = cz + (delta ?? 0) * zoomSpeed * cz
        this._setCamera(new Vec(cx + x / zoom - x / cz, cy + y / zoom - y / cz, zoom), {
          immediate: true,
        })
        this.maybeTrackPerformance('Zooming')
        return
      }
      case 'pan': {
        // Pan the camera based on the wheel delta
        this._setCamera(new Vec(cx + (dx * panSpeed) / cz, cy + (dy * panSpeed) / cz, cz), {
          immediate: true,
        })
        this.maybeTrackPerformance('Panning')
        return
      }
    }
  }
  break
}
```

## Ctrl key modifier (escape hatch)

From `Editor.ts:10446`:

```typescript
if (info.ctrlKey) behavior = wheelBehavior === 'pan' ? 'zoom' : 'pan'
```

**Behavior:**

- When `wheelBehavior === 'pan'` and Ctrl pressed → zoom
- When `wheelBehavior === 'zoom'` and Ctrl pressed → pan
- Allows temporary behavior inversion without changing preference
- Common pattern in canvas apps (Figma, Sketch, etc.)

## Zoom calculation differences

**Mouse wheel zoom mode:**
From `Editor.ts:10455-10461`:

```typescript
if (wheelBehavior === 'zoom') {
	if (Math.abs(dy) > 10) {
		delta = (10 * Math.sign(dy)) / 100
	} else {
		delta = dy / 100
	}
}
```

**Constants:**

- Threshold: `10` pixels
- Scale factor: `100` (divide by 100)
- Clamp: `Math.abs(dy) > 10` → use `±10` instead

**Why this matters:**

- Mouse wheels can produce very large `deltaY` values (100+ pixels per notch)
- Without clamping, a single wheel notch could zoom from 100% to 300% instantly
- Clamping creates discrete, predictable zoom steps
- Each notch ≈ 10% zoom change (10/100 = 0.1)

**Trackpad zoom (pinch gesture):**
Uses `dz` directly from `normalizeWheel()`, which already processes pinch gestures appropriately. The `dz` value comes from `@use-gesture/react` pinch handling.

From `Editor.ts:10463`:

```typescript
const zoom = cz + (delta ?? 0) * zoomSpeed * cz
```

**Zoom-at-point calculation:**
From `Editor.ts:10464`:

```typescript
this._setCamera(new Vec(cx + x / zoom - x / cz, cy + y / zoom - y / cz, zoom), {
	immediate: true,
})
```

**Math breakdown:**

- `cz` = current zoom level
- `zoom` = new zoom level
- `x, y` = cursor position in screen space
- `cx, cy` = current camera position
- New camera position: `(cx + x/zoom - x/cz, cy + y/zoom - y/cz)`

This keeps the point under the cursor fixed in page space while zooming.

**Derivation:**

```
// Point P in page space:
P = camera + cursor/zoom

// Keep P constant:
P = old_camera + cursor/old_zoom = new_camera + cursor/new_zoom

// Solve for new_camera:
new_camera = old_camera + cursor/new_zoom - cursor/old_zoom
```

## Pan calculation

From `Editor.ts:10472`:

```typescript
this._setCamera(new Vec(cx + (dx * panSpeed) / cz, cy + (dy * panSpeed) / cz, cz), {
	immediate: true,
})
```

**Why divide by zoom:**

- `dx, dy` are in screen-space pixels
- Camera position is in page space
- At zoom level 2 (200%), 10 screen pixels = 5 page units
- Division by `cz` converts screen delta to page delta

## Wheel normalization

From `packages/editor/src/lib/utils/normalizeWheel.ts`:

```typescript
const MAX_ZOOM_STEP = 10
const IS_DARWIN = /Mac|iPod|iPhone|iPad/.test(
	typeof window === 'undefined' ? 'node' : window.navigator.platform
)

export function normalizeWheel(event: WheelEvent | React.WheelEvent<HTMLElement>) {
	let { deltaY, deltaX } = event
	let deltaZ = 0

	// wheeling
	if (event.ctrlKey || event.altKey || event.metaKey) {
		deltaZ = (Math.abs(deltaY) > MAX_ZOOM_STEP ? MAX_ZOOM_STEP * Math.sign(deltaY) : deltaY) / 100
	} else {
		if (event.shiftKey && !IS_DARWIN) {
			deltaX = deltaY
			deltaY = 0
		}
	}

	return { x: -deltaX, y: -deltaY, z: -deltaZ }
}
```

**Key behaviors:**

- `Ctrl/Alt/Meta` keys → treat as zoom gesture (set `deltaZ`)
- `Shift` key (non-macOS) → swap X/Y for horizontal scrolling
- Clamp zoom delta to ±10 pixels max
- Negate all deltas (browser convention vs tldraw convention differ)

**Why MAX_ZOOM_STEP = 10:**
Matches the threshold used in Editor zoom handling. Ensures consistent zoom speed regardless of where normalization happens.

## UI component

From `packages/tldraw/src/lib/ui/components/InputModeMenu.tsx`:

```typescript
const MODES = ['auto', 'trackpad', 'mouse'] as const

export function InputModeMenu() {
  const editor = useEditor()
  const trackEvent = useUiEvents()

  const inputMode = useValue('inputMode', () => editor.user.getUserPreferences().inputMode, [
    editor,
  ])
  const wheelBehavior = useValue('wheelBehavior', () => editor.getCameraOptions().wheelBehavior, [
    editor,
  ])

  const isModeChecked = (mode: string) => {
    if (mode === 'auto') {
      return inputMode === null
    }
    return inputMode === mode
  }

  const getLabel = (mode: string, wheelBehavior: 'zoom' | 'pan' | 'none') => {
    if (mode === 'auto') {
      return `action.toggle-auto-${wheelBehavior}`
    }

    return mode === 'trackpad' ? 'action.toggle-trackpad' : 'action.toggle-mouse'
  }

  return (
    <TldrawUiMenuSubmenu id="help menu input-mode" label="menu.input-mode">
      <TldrawUiMenuGroup id="peripheral-mode">
        {MODES.map((mode) => (
          <TldrawUiMenuCheckboxItem
            id={`peripheral-mode-${mode}`}
            key={mode}
            label={getLabel(mode, wheelBehavior)}
            checked={isModeChecked(mode)}
            readonlyOk
            onSelect={() => {
              trackEvent('input-mode', { source: 'menu', value: mode })
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
  )
}
```

**Radio-style selection:**

- Three mutually exclusive options
- Only one can be checked at a time
- `isModeChecked()` determines which option is active

**Dynamic auto label:**

- Auto mode label reflects current `wheelBehavior` from camera options
- `action.toggle-auto-pan` if `wheelBehavior === 'pan'`
- `action.toggle-auto-zoom` if `wheelBehavior === 'zoom'`
- `action.toggle-auto-none` if `wheelBehavior === 'none'`

## Translation keys

From `packages/assets/translations/main.json`:

```json
{
	"action.toggle-auto-pan": "Auto (trackpad)",
	"action.toggle-auto-zoom": "Auto (mouse)",
	"action.toggle-auto-none": "Auto",
	"action.toggle-mouse": "Mouse",
	"action.toggle-trackpad": "Trackpad",
	"menu.input-mode": "Input mode"
}
```

**Why separate auto labels:**
Users need to know what "auto" means for their current configuration. If `wheelBehavior` defaults to `'pan'`, auto mode should say "Auto (trackpad)" to clarify the behavior.

## Analytics tracking

From `InputModeMenu.tsx:47`:

```typescript
trackEvent('input-mode', { source: 'menu', value: mode })
```

From `packages/tldraw/src/lib/ui/context/events.tsx:106`:

```typescript
export interface TLUiEventMap {
	// ...
	'input-mode': { value: string }
	// ...
}
```

**Event data:**

- Event name: `'input-mode'`
- Source: `'menu'` (could theoretically track from other sources)
- Value: `'auto'`, `'trackpad'`, or `'mouse'`

Analytics help understand:

- What percentage of users change from default
- Which mode is most popular
- Whether users discover the preference

## Integration with gesture system

The wheel handler runs before pinch disambiguation. From `packages/editor/src/lib/hooks/useGestureEvents.ts:84-94`:

```typescript
const onWheel: Handler<'wheel', WheelEvent> = ({ event }) => {
	if (!editor.getInstanceState().isFocused) {
		return
	}

	pinchState = 'not sure'

	if (isWheelEndEvent(Date.now())) {
		// ignore wheelEnd events
		return
	}

	// ... rest of wheel handling
}
```

**Key point:** `pinchState = 'not sure'` happens before phantom event filtering. Every wheel event (including filtered phantoms) resets pinch state. This ensures clean state machine transitions.

## Vec class structure

From `packages/editor/src/lib/primitives/Vec.ts:9-14`:

```typescript
export class Vec {
	constructor(
		public x = 0,
		public y = 0,
		public z = 1 // Used for camera zoom level
	) {}
}
```

Camera position stored as `Vec(x, y, z)` where:

- `x, y`: Page-space position (top-left corner of viewport)
- `z`: Zoom level (1 = 100%, 2 = 200%, 0.5 = 50%)

## Why not per-event detection?

Even if detection were reliable, dynamic switching has problems:

**1. Mode confusion:**
If detection occasionally gets it wrong (say, 5% error rate), users can't build muscle memory. Same gesture sometimes pans, sometimes zooms.

**2. Device switching jarring:**
User with laptop + external mouse would experience abrupt behavior changes when switching between devices. No way to choose which device's behavior to prioritize.

**3. Trust erosion:**
Heuristic-based behavior feels unpredictable. Users don't understand why it works one way sometimes and differently other times. Explicit control builds trust.

**4. Maintenance burden:**
Heuristics require constant tuning as browsers, OSes, and hardware evolve. One Chrome update could break detection across all users.

## Alternative approaches considered

**1. Library detection:**
Some gesture libraries (like Hammer.js) attempt device detection. But they face same API limitations and resort to same unreliable heuristics.

**2. First-use wizard:**
Could show modal on first use asking user to identify their device. Adds onboarding friction and doesn't handle multiple devices.

**3. Automatic learning:**
Track user's behavior patterns (do they pan or zoom more?) and guess intent. Complex, unpredictable, and still guesses wrong sometimes.

**4. Per-wheel-event gesture analysis:**
Analyze velocity, acceleration, direction changes to classify gesture type. Expensive computation, introduces latency, and still error-prone.

**5. OS/browser feature detection:**
Check for touch screen, specific hardware APIs, etc. Tells you device capabilities, not which device user is actively using.

## Browser support notes

**BroadcastChannel:**

- Supported in modern browsers (Chrome 54+, Firefox 38+, Safari 15.4+)
- Gracefully degrades: preference changes don't sync across tabs
- Mock implementation for Node.js test environment

From `TLUserPreferences.ts:233-236`:

```typescript
const channel =
	typeof BroadcastChannel !== 'undefined' && !isTest
		? new BroadcastChannel('tldraw-user-sync')
		: null
```

**localStorage:**

- Universal support
- 5-10MB quota (sufficient for user preferences)
- Synchronous API (blocking, but data is small)

## Performance considerations

**Immediate camera updates:**
From `Editor.ts:10464` and `10472`:

```typescript
this._setCamera(newPos, { immediate: true })
```

The `immediate: true` flag bypasses animation system. Wheel events need instant feedback to feel responsive. Any delay makes panning/zooming feel sluggish.

**Performance tracking:**
From `Editor.ts:10467` and `10475`:

```typescript
this.maybeTrackPerformance('Zooming')
this.maybeTrackPerformance('Panning')
```

Optional performance monitoring to detect performance issues during camera operations.

## Related systems

**Pinch gesture handling:**
Two-finger trackpad gestures can be pinch-to-zoom or two-finger-pan. Separate disambiguation system determines intent (see `pinch-gesture.md`).

**Wheel momentum filtering:**
The `@use-gesture/react` library fires phantom wheel events ~140ms after momentum ends. Timestamp-based filtering prevents canvas from jumping (see `wheel-momentum.md`).

**Scrollable shape handling:**
From `useGestureEvents.ts:101-113`:

```typescript
const editingShapeId = editor.getEditingShapeId()
if (editingShapeId) {
	const shape = editor.getShape(editingShapeId)
	if (shape) {
		const util = editor.getShapeUtil(shape)
		if (util.canScroll(shape)) {
			const bounds = editor.getShapePageBounds(editingShapeId)
			if (bounds?.containsPoint(editor.inputs.getCurrentPagePoint())) {
				return // Let the shape handle scrolling
			}
		}
	}
}
```

If user is editing a scrollable shape (like text or iframe) and cursor is over it, wheel events pass through to the shape instead of panning/zooming canvas.

## Key source files

- `packages/editor/src/lib/editor/Editor.ts:10417-10480` — Wheel event handling logic
- `packages/editor/src/lib/config/TLUserPreferences.ts` — Preference types, storage, sync
- `packages/editor/src/lib/constants.ts:5-11` — Default camera options
- `packages/editor/src/lib/editor/types/misc-types.ts:93-111` — TLCameraOptions interface
- `packages/editor/src/lib/utils/normalizeWheel.ts` — Wheel delta normalization
- `packages/tldraw/src/lib/ui/components/InputModeMenu.tsx` — UI component
- `packages/assets/translations/main.json` — Translation strings
- `packages/tldraw/src/lib/ui/context/events.tsx:106` — Analytics event definition
- `packages/editor/src/lib/hooks/useGestureEvents.ts:84-94` — Gesture system integration
- `packages/editor/src/lib/primitives/Vec.ts:9-14` — Vec class with z coordinate for zoom
