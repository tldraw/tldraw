# Back to content

It can be easy to get lost on the canvas. If a user pans far enough away from their content, it might be frustrating to traverse their way back. So we need some way to get back to content when a user is sufficiently far away - but how far would that be?

We make the "Back to content" button appear when all shapes on the page are outside the viewport. When clicked, it animates the camera to bring the content back into view, zooming to fit the selection bounds (if any shapes are selected) or the page bounds (if nothing is selected).

Selection bounds are the axis-aligned bounding box that encompasses all currently selected shapes.

1. Gets the page bounds of each selected shape
2. Uses Box.Common(bounds) to compute the minimal bounding box containing all of them

### The back-to-content action

When clicked, the button triggers the `back-to-content` action:

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

### Reusing visibility tracking

We already track which shapes are outside the viewport for rendering performance—we skip drawing shapes you can't see. This seemed like the obvious way to know if the user is lost: if every shape is culled, show the button.

But there was a problem. Selected shapes are intentionally excluded from culling—we always render them so they stay visible even when off-screen. This meant if you selected some shapes and panned away, the button wouldn't appear. You'd be looking at empty canvas with no way back.

We switched to tracking visibility separately from culling. Now we check whether shapes are geometrically outside the viewport, regardless of whether we're actually rendering them.

### Avoiding flicker

The button needs to respond immediately when you pan away—a one-frame delay would feel broken. But checking visibility on every viewport change could cause the button to flicker during rapid panning.

We track the current visibility in a ref, and only update React state when the visibility actually changes. The ref gives us a synchronous check without triggering re-renders; the state triggers the actual render when needed.
