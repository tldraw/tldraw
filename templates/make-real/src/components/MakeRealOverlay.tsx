import { atom, DefaultSpinner, TLShapeId, useEditor, useValue } from 'tldraw'

export const makingRealShapeIdsAtom = atom<Set<TLShapeId>>(
	'makingRealShapeIds',
	new Set<TLShapeId>()
)

export function MakeRealOverlay() {
	const editor = useEditor()

	const overlays = useValue(
		'makingRealOverlays',
		() => {
			const ids = makingRealShapeIdsAtom.get()
			if (ids.size === 0) return []

			return Array.from(ids).flatMap((id) => {
				const bounds = editor.getShapePageBounds(id)
				if (!bounds) return []
				const topLeft = editor.pageToViewport({ x: bounds.minX, y: bounds.minY })
				const bottomRight = editor.pageToViewport({ x: bounds.maxX, y: bounds.maxY })
				return [
					{
						id,
						left: topLeft.x,
						top: topLeft.y,
						width: bottomRight.x - topLeft.x,
						height: bottomRight.y - topLeft.y,
					},
				]
			})
		},
		[editor]
	)

	if (overlays.length === 0) return null

	return (
		<>
			{overlays.map((overlay) => (
				<div
					key={overlay.id}
					className="makeRealShapeOverlay"
					style={{
						left: overlay.left,
						top: overlay.top,
						width: overlay.width,
						height: overlay.height,
					}}
				>
					<DefaultSpinner />
				</div>
			))}
		</>
	)
}
