import { useRef } from 'react'
import { TLShapeId, useEditor, useEditorComponents, useValue } from 'tldraw'

export function ShapeIndicators() {
	const editor = useEditor()
	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])
	const rPreviousSelectedShapeIds = useRef<Set<TLShapeId>>(new Set())
	const idsToDisplay = useValue(
		'should display selected ids',
		() => {
			// todo: move to tldraw selected ids wrappe
			const prev = rPreviousSelectedShapeIds.current
			const next = new Set<TLShapeId>()
			const instanceState = editor.getInstanceState()
			if (!instanceState.isChangingStyle) {
				const selected = editor.getSelectedShapeIds()
				for (const id of selected) {
					next.add(id)
				}

				if (instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
					const hovered = editor.getHoveredShapeId()
					if (hovered) next.add(hovered)
				}
			}

			if (prev.size !== next.size) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			for (const id of next) {
				if (!prev.has(id)) {
					rPreviousSelectedShapeIds.current = next
					return next
				}
			}

			return prev
		},
		[editor]
	)

	const { ShapeIndicator } = useEditorComponents()
	if (!ShapeIndicator) return null

	return (
		<>
			{renderingShapes.map(({ id }) => (
				<ShapeIndicator key={id + '_indicator'} shapeId={id} hidden={!idsToDisplay.has(id)} />
			))}
		</>
	)
}
