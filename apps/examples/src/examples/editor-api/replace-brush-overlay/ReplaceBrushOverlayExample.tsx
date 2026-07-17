import { Tldraw, defaultOverlayUtils } from 'tldraw'
import 'tldraw/tldraw.css'
import { DashedBrushOverlayUtil } from './DashedBrushOverlayUtil'

// There's a guide at the bottom of this file!

// [1]
const overlayUtils = [
	...defaultOverlayUtils.filter((util) => util.type !== 'brush'),
	DashedBrushOverlayUtil,
]

export default function ReplaceBrushOverlayExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} />
		</div>
	)
}

/*
The canvas overlays — brush, scribble, snap indicators, selection handles, and so
on — are all `OverlayUtil` subclasses. To replace one, subclass the built-in util
and override the methods you want to change.

`DashedBrushOverlayUtil.ts` extends `BrushOverlayUtil` and overrides `render`
to draw a dashed purple rectangle. `getOverlays` and `isActive` are inherited,
so it still activates exactly when the built-in brush would. Try drag-selecting
a region on the canvas.

[1]
Take `defaultOverlayUtils`, drop the built-in util whose `type` matches the one
you're replacing (`'brush'` here), and append your subclass. Order doesn't
matter for correctness — paint order is determined by `options.zIndex`, which
the subclass inherits from the parent.
*/
