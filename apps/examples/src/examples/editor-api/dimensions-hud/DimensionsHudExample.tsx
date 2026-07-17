import { Tldraw, defaultOverlayUtils } from 'tldraw'
import 'tldraw/tldraw.css'
import { DimensionsHudOverlayUtil } from './DimensionsHudOverlayUtil'

// There's a guide at the bottom of this file!

// [1]
const overlayUtils = [...defaultOverlayUtils, DimensionsHudOverlayUtil]

export default function DimensionsHudExample() {
	return (
		<div className="tldraw__editor">
			{/* [2] */}
			<Tldraw overlayUtils={overlayUtils} />
		</div>
	)
}

/*
This example adds a non-interactive dimensions label that follows the current
selection. The label is implemented as a custom `OverlayUtil`, so it renders in
the editor's canvas overlay layer rather than in the React tree.

`DimensionsHudOverlayUtil.ts` does three things:

- `isActive()` subscribes to the current selection and skips work when nothing
  is selected.
- `getOverlays()` derives the label's page-space position, dimensions, and
  rotation from the selected shape or selection bounds.
- `render()` draws the pill with Canvas 2D APIs.

[1]
Register the custom overlay util after `defaultOverlayUtils` so the built-in
overlays remain enabled. The util's `options.zIndex` controls where it appears
relative to the selection handles and other canvas overlays.

[2]
Pass the overlay util array to the `overlayUtils` prop on `<Tldraw>`.
*/
