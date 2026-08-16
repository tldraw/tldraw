import { Tldraw, defaultOverlayUtils } from 'tldraw'
import 'tldraw/tldraw.css'
import { PointerRingOverlayUtil } from './PointerRingOverlayUtil'

// There's a guide at the bottom of this file!

// [1]
const overlayUtils = [...defaultOverlayUtils, PointerRingOverlayUtil]

export default function CustomOverlayExample() {
	return (
		<div className="tldraw__editor">
			{/* [2] */}
			<Tldraw overlayUtils={overlayUtils} />
		</div>
	)
}

/*
Overlays are ephemeral UI drawn on top of the canvas — selection handles, the
brush rectangle, snap indicators, and so on. They render into a Canvas 2D
context, not the React tree, so they're cheap even during fast interactions.

To add your own, subclass `OverlayUtil` and implement three methods:

- `isActive()` — whether the overlay should render right now. Checked reactively.
- `getOverlays()` — one or more overlay instances derived from editor state.
- `render(ctx, overlays)` — draw into a page-space canvas context.

See `PointerRingOverlayUtil.ts` for a minimal implementation that draws a ring
following the cursor. `getOverlays()` reads the reactive
`editor.inputs.getCurrentPagePoint()`, so the ring redraws automatically as the
pointer moves. Because the context is in page space, `render()` divides the
ring's radius and line width by the zoom level to keep them a constant size on
screen.

[1]
Register your overlay util alongside `defaultOverlayUtils` so the built-in
overlays (selection, brush, scribble, snap, handles, collaborator brushes and
scribbles) stay intact. Passing an array without them removes those overlays. `options.zIndex`
controls paint order; higher paints on top.

[2]
Pass the array to the `overlayUtils` prop on `<Tldraw>`. Each util is
constructed once when the editor mounts, so define the array at module level.
*/
