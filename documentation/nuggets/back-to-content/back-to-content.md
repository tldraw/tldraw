# Back to content

It can be easy to get lost on the canvas. If a user pans far enough away from their content, it might be frustrating to traverse their way back. So we need some way to get back to content when a user is sufficiently far away - but how far would that be?

We make the "Back to content" button appear when all shapes on the page are outside the viewport. When clicked, it animates the camera to bring the content back into view, zooming to fit the selection bounds (if any shapes are selected) or the page bounds (if nothing is selected).

The component uses `useQuickReactor` instead of `useValue` or `useReactor`. This is because the visibility check needs to run immediately when the viewport changes, not batched to the next animation frame.

```tsx
/**
 * A React hook that runs side effects immediately in response to signal changes, without throttling.
 * Unlike useReactor which batches updates to animation frames, useQuickReactor executes the effect
 * function immediately when dependencies change, making it ideal for critical updates that cannot wait.
 */
export function useQuickReactor(name: string, reactFn: () => void, deps: any[] = EMPTY_ARRAY) {
	useEffect(() => {
		const scheduler = new EffectScheduler(name, reactFn)
		scheduler.attach()
		scheduler.execute()
		return () => {
			scheduler.detach()
		}
	}, deps)
}
```

The component uses both React state (`showBackToContent`) and a ref (`rIsShowing`). This prevents unnecessary re-renders:

```tsx
const [showBackToContent, setShowBackToContent] = useState(false)
const rIsShowing = useRef(false)

// Later...
if (showBackToContentPrev !== showBackToContentNow) {
	setShowBackToContent(showBackToContentNow)
	rIsShowing.current = showBackToContentNow
}
```

The ref tracks the current visibility state without triggering re-renders. The state only updates when the visibility actually changes. This prevents the button from flickering during rapid viewport updates.

### The back-to-content action

When clicked, the button triggers the `back-to-content` action:

From `packages/tldraw/src/lib/ui/context/actions.tsx:1421-1434`:

```tsx
{
    id: 'back-to-content',
    label: 'action.back-to-content',
    icon: 'arrow-left',
    readonlyOk: true,
    onSelect(source) {
        trackEvent('zoom-to-content', { source })
        const bounds = editor.getSelectionPageBounds() ?? editor.getCurrentPageBounds()
        if (!bounds) return
        editor.zoomToBounds(bounds, {
            targetZoom: Math.min(1, editor.getZoomLevel()),
            animation: { duration: 220 },
        })
    },
},
```

The action:

1. Gets the selection bounds if shapes are selected, otherwise the page bounds
2. Zooms to those bounds with a 220ms animation
3. Caps the target zoom at 1 (100%) or the current zoom level, whichever is smaller

This means if you're zoomed way out and click back to content, you'll see your shapes at 100% zoom. But if you're already zoomed in, you'll stay at your current zoom level.

### The visibility system

The visibility check relies on `getNotVisibleShapes()`:

From `packages/editor/src/lib/editor/derivations/notVisibleShapes.ts:11-68`:

```tsx
export function notVisibleShapes(editor: Editor) {
	return computed<Set<TLShapeId>>('notVisibleShapes', function updateNotVisibleShapes(prevValue) {
		const shapeIds = editor.getCurrentPageShapeIds()
		const nextValue = new Set<TLShapeId>()

		// Extract viewport bounds once to avoid repeated property access
		const viewportPageBounds = editor.getViewportPageBounds()
		const viewMinX = viewportPageBounds.minX
		const viewMinY = viewportPageBounds.minY
		const viewMaxX = viewportPageBounds.maxX
		const viewMaxY = viewportPageBounds.maxY

		for (const id of shapeIds) {
			const pageBounds = editor.getShapePageBounds(id)

			// Hybrid check: if bounds exist and shape overlaps viewport, it's visible.
			if (
				pageBounds !== undefined &&
				pageBounds.maxX >= viewMinX &&
				pageBounds.minX <= viewMaxX &&
				pageBounds.maxY >= viewMinY &&
				pageBounds.minY <= viewMaxY
			) {
				continue
			}

			// Shape is outside viewport or has no bounds - check if it can be culled.
			const shape = editor.getShape(id)
			if (!shape) continue

			const canCull = editor.getShapeUtil(shape.type).canCull(shape)
			if (!canCull) continue

			nextValue.add(id)
		}
		// ... incremental update logic
	})
}
```

Some shapes can't be culled (they return `canCull: false`). These shapes always render even when offscreen, so they don't count toward the "all shapes not visible" check.

### Helper buttons context

The BackToContent component lives with other helper buttons:

From `packages/tldraw/src/lib/ui/components/HelperButtons/DefaultHelperButtonsContent.tsx:1-14`:

```tsx
import { BackToContent } from './BackToContent'
import { ExitPenMode } from './ExitPenMode'
import { StopFollowing } from './StopFollowing'

/** @public @react */
export function DefaultHelperButtonsContent() {
	return (
		<>
			<ExitPenMode />
			<BackToContent />
			<StopFollowing />
		</>
	)
}
```

These are context-sensitive UI elements that appear when needed:

- **ExitPenMode**: Shown when in pen mode
- **BackToContent**: Shown when all shapes are offscreen
- **StopFollowing**: Shown when following another user's viewport

### Styling

The helper buttons container is styled to appear in the upper-left:

From `packages/tldraw/src/lib/ui.css:372-383`:

```css
.tlui-helper-buttons {
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: flex-start;
	width: min-content;
	gap: var(--tl-space-3);
	margin: var(--tl-space-2) var(--tl-space-3);
	white-space: nowrap;
	pointer-events: none;
	z-index: var(--tl-layer-panels);
}
```

## Architecture and patterns

### Reactive derivation reuse

The key architectural insight is reusing the visibility tracking system. Not-visible shapes are computed for rendering performance (to skip rendering offscreen shapes), but the same information answers a UX question: "is the user lost?"

This is a pattern worth noting. When building reactive systems, computed derivations often answer multiple questions. The `getNotVisibleShapes()` derivation exists to improve rendering performance, but it also provides exactly the information needed for navigation UI.

### Immediate vs. batched updates

The choice of `useQuickReactor` over `useReactor` is deliberate. Most UI updates can be batched to animation frames for performance. But the "Back to content" button needs to appear immediately when you pan away from content. A one-frame delay would feel broken.

### State and ref together

The pattern of using both `useState` and `useRef` for the same value is uncommon but useful here. The ref provides a synchronous check without causing re-renders, while the state triggers the actual render when needed.
