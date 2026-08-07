import { TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import './hovered-overlay.css'

// There's a guide at the bottom of this file!

// [1]
function HoveredOverlayReadout() {
	const editor = useEditor()
	const hovered = useValue('hoveredOverlay', () => editor.overlays.getHoveredOverlay(), [editor])

	return (
		<div className="hovered-overlay-readout">
			{hovered ? (
				<>
					<div>
						<span>type</span>
						<code>{hovered.type}</code>
					</div>
					<div>
						<span>id</span>
						<code>{hovered.id}</code>
					</div>
				</>
			) : (
				<div className="hovered-overlay-readout__empty">Select a shape, then hover its handles</div>
			)}
		</div>
	)
}

// [2]
const components: TLComponents = {
	TopPanel: HoveredOverlayReadout,
}

export default function HoveredOverlayExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
The editor exposes an `OverlayManager` on `editor.overlays` that tracks every
active canvas overlay — selection handles, resize corners, rotation handles,
shape handles, and so on. It gives you reactive access to the overlay the user
is hovering and hit-testing at an arbitrary page point.

Key methods on `editor.overlays`:

- `getHoveredOverlay()` — the `TLOverlay` currently under the pointer, or null.
  Reactive: updates as the pointer moves.
- `getOverlayAtPoint(point, margin?)` — hit test any page-space point against
  all interactive overlays. Returns the topmost match, or null.
- `getCurrentOverlays()` — every active overlay in paint order.
- `getOverlayGeometry(overlay)` — cached hit-test geometry for an overlay.

[1]
Read `editor.overlays.getHoveredOverlay()` inside `useValue` so the component
re-renders whenever the hovered overlay changes. Select a shape to produce
handles, then hover one — you'll see its type (e.g. `selection_fg`, `handle`)
and fully-qualified id.

[2]
Mount the readout into the `TopPanel` component slot.
*/
