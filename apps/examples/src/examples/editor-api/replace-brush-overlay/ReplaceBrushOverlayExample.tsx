import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { DashedBrushOverlayUtil } from './DashedBrushOverlayUtil'

// There's a guide at the bottom of this file!

// [1]
const overlayUtils = [DashedBrushOverlayUtil]

export default function ReplaceBrushOverlayExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} />
		</div>
	)
}

/*
The canvas overlays (brush, scribble, snap indicators, selection handles, and so on) are all
`OverlayUtil` subclasses. To replace one, subclass the built-in util and override the methods you
want to change.

`DashedBrushOverlayUtil.ts` extends `BrushOverlayUtil` and overrides `render` to draw a dashed purple
rectangle. `getOverlays`, `isActive`, and the static `type` are inherited, so it activates exactly when
the built-in brush would. Try drag-selecting a region on the canvas.

[1]
`<Tldraw>` merges the overlay utils you pass with the defaults, and a custom util whose static `type`
matches a default replaces it. Since our subclass inherits `type = 'brush'`, passing it alone is enough
to swap out the built-in brush. `shapeUtils` and `bindingUtils` merge by static `type` the same
way; `tools` merge by static `id`.
*/
