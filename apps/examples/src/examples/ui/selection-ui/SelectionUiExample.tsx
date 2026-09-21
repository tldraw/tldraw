import { TLComponents, Tldraw, Vec, intersectLineSegmentPolygon, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
function SelectionUi() {
	const editor = useEditor()

	// [2]
	const info = useValue(
		'selection bounds',
		() => {
			const screenBounds = editor.getViewportScreenBounds()
			const rotation = editor.getSelectionRotation()
			const rotatedScreenBounds = editor.getSelectionRotatedScreenBounds()
			if (!rotatedScreenBounds) return
			return {
				x: rotatedScreenBounds.x - screenBounds.x,
				y: rotatedScreenBounds.y - screenBounds.y,
				width: rotatedScreenBounds.width,
				height: rotatedScreenBounds.height,
				rotation,
			}
		},
		[editor]
	)

	if (!info) return null

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				transformOrigin: 'top left',
				transform: `translate(${info.x}px, ${info.y}px) rotate(${info.rotation}rad)`,
				pointerEvents: 'all',
			}}
		>
			<DuplicateInDirectionButton y={-40} x={info.width / 2 - 16} rotation={-Math.PI / 2} />
			<DuplicateInDirectionButton y={info.height / 2 - 16} x={info.width + 8} rotation={0} />
			<DuplicateInDirectionButton
				y={info.height + 8}
				x={info.width / 2 - 16}
				rotation={Math.PI / 2}
			/>
			<DuplicateInDirectionButton y={info.height / 2 - 16} x={-40} rotation={Math.PI} />
		</div>
	)
}

// [3]
function DuplicateInDirectionButton({
	x,
	y,
	rotation,
}: {
	x: number
	y: number
	rotation: number
}) {
	const editor = useEditor()

	return (
		<button
			style={{
				position: 'absolute',
				width: 32,
				height: 32,
				transform: `translate(${x}px, ${y}px) rotate(${rotation}rad)`,
			}}
			onClick={() => {
				const selectionRotation = editor.getSelectionRotation() ?? 0
				const rotatedPageBounds = editor.getSelectionRotatedPageBounds()
				if (!rotatedPageBounds) return

				editor.markHistoryStoppingPoint('duplicate in direction')

				const PADDING = 32

				// [4]
				const center = Vec.Rot(rotatedPageBounds.center, selectionRotation)
				const int = intersectLineSegmentPolygon(
					center,
					Vec.Add(center, new Vec(100000, 0).rot(selectionRotation + rotation)),
					rotatedPageBounds
						.clone()
						.expandBy(PADDING)
						.corners.map((c) => c.rot(selectionRotation))
				)
				if (!int?.[0]) return

				const delta = Vec.Sub(int[0], center)
				const offset = delta.uni().mul(delta.len() * 2)

				editor.duplicateShapes(editor.getSelectedShapes(), offset)
			}}
		>
			→
		</button>
	)
}

const components: TLComponents = {
	InFrontOfTheCanvas: SelectionUi,
}

export default function SelectionUiExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="selection-ui-example" components={components} />
		</div>
	)
}

/*
This example adds four "duplicate in this direction" buttons around the current
selection, rendered in the InFrontOfTheCanvas slot.

[1]
InFrontOfTheCanvas renders in screen space above the canvas, so it doesn't
scale with the camera. That makes it the right place for controls that should
stay a fixed size while following the selection. The slot's wrapper has
`pointer-events: none` and already marks pointer events as handled, so we only
need to opt our container back in with `pointerEvents: 'all'`.

[2]
`getSelectionRotatedScreenBounds` gives the selection's bounds in screen space,
already rotated to match the selection. Those coordinates are relative to the
whole window, so we subtract the viewport's screen position to get coordinates
relative to the tldraw component. Reading everything inside `useValue` keeps
the buttons glued to the selection as it moves, rotates, or the camera pans.

[3]
Each button's `rotation` sets both its CSS rotation and the direction the copies
are offset in, zeroed to the right.

[4]
To offset the copies by exactly one selection-width plus padding in the chosen
direction, we cast a ray from the selection's center and find where it exits the
padded, rotated selection bounds. Doubling that distance lands the duplicates
just past the original in that direction.
*/
