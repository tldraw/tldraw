import {
	TLComponents,
	Tldraw,
	Vec,
	intersectLineSegmentPolygon,
	stopEventPropagation,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

const components: TLComponents = {
	InFrontOfTheCanvas: () => {
		const editor = useEditor()

		const info = useValue(
			'selection bounds',
			() => {
				const screenBounds = editor.getViewportScreenBounds()
				const rotation = editor.getSelectionRotation()
				const rotatedScreenBounds = editor.getSelectionRotatedScreenBounds()
				if (!rotatedScreenBounds) return
				return {
					// we really want the position within the
					// tldraw component's bounds, not the screen itself
					x: rotatedScreenBounds.x - screenBounds.x,
					y: rotatedScreenBounds.y - screenBounds.y,
					width: rotatedScreenBounds.width,
					height: rotatedScreenBounds.height,
					rotation: rotation,
				}
			},
			[editor]
		)

		if (!info) return

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
				onPointerDown={stopEventPropagation}
			>
				<DuplicateInDirectionButton y={-40} x={info.width / 2 - 16} rotation={-(Math.PI / 2)} />
				<DuplicateInDirectionButton y={info.height / 2 - 16} x={info.width + 8} rotation={0} />
				<DuplicateInDirectionButton
					y={info.height + 8}
					x={info.width / 2 - 16}
					rotation={Math.PI / 3}
				/>
				<DuplicateInDirectionButton y={info.height / 2 - 16} x={-40} rotation={Math.PI} />
			</div>
		)
	},
}

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" components={components} />
		</div>
	)
}

/**
 * This button will duplicate the editor's current selected shapes in
 * a certain direction. Its rotation determines the appearance of the
 * button (its actual css rotation) as well as the direction in which
 * the duplicated shapes are offset from the original shapes. It's
 * zeroed to the right.
 */
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
				pointerEvents: 'all',
				transform: `translate(${x}px, ${y}px) rotate(${rotation}rad)`,
			}}
			onPointerDown={stopEventPropagation}
			onClick={() => {
				const selectionRotation = editor.getSelectionRotation() ?? 0
				const rotatedPageBounds = editor.getSelectionRotatedPageBounds()!
				const selectionPageBounds = editor.getSelectionPageBounds()!
				if (!(rotatedPageBounds && selectionPageBounds)) return

				editor.mark('duplicating in direction')

				const PADDING = 32

				// Find an intersection with the page bounds
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

				// Get the direction and distance to the intersection
				const delta = Vec.Sub(int[0], center)
				const dist = delta.len()
				const dir = delta.norm()

				// Get the offset for the duplicated shapes
				const offset = dir.mul(dist * 2)

				editor.duplicateShapes(editor.getSelectedShapes(), offset)
			}}
		>
			→
		</button>
	)
}
