import { useValue } from '@tldraw/state-react'
import { TLShapeId } from '@tldraw/tlschema'
import { memo, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { useEditorComponents } from '../../hooks/useEditorComponents'

/** @public @react */
export const DefaultShapeIndicators = memo(function DefaultShapeIndicators() {
	const editor = useEditor()

	const rPreviousSelectedShapeIds = useRef<Set<TLShapeId>>(new Set())

	const idsToDisplay = useValue(
		'should display selected ids',
		() => {
			const prev = rPreviousSelectedShapeIds.current
			const next = new Set<TLShapeId>()

			if (
				// We only show indicators when in the following states...
				editor.isInAny(
					'select.idle',
					'select.brushing',
					'select.scribble_brushing',
					'select.editing_shape',
					'select.pointing_shape',
					'select.pointing_selection',
					'select.pointing_handle'
				) &&
				// ...but we hide indicators when we've just changed a style (so that the user can see the change)
				!editor.getInstanceState().isChangingStyle
			) {
				// We always want to show indicators for the selected shapes, if any
				const selected = editor.getSelectedShapeIds()
				for (const id of selected) {
					next.add(id)
				}

				// If we're idle or editing a shape, we want to also show an indicator for the hovered shape, if any
				if (editor.isInAny('select.idle', 'select.editing_shape')) {
					const instanceState = editor.getInstanceState()
					if (instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
						const hovered = editor.getHoveredShapeId()
						if (hovered) next.add(hovered)
					}
				}
			}

			// Ok, has anything changed?

			// If the number of items in the set is different, then the selection has changed. This catches most changes.
			if (prev.size !== next.size) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			// If any of the new ids are not in the previous set, then the selection has changed
			for (const id of next) {
				if (!prev.has(id)) {
					rPreviousSelectedShapeIds.current = next
					return next
				}
			}

			// If nothing has changed, then return the previous value
			return prev
		},
		[editor]
	)

	// Show indicators only for the shapes that are currently being rendered (ie that are on screen)
	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

	const { ShapeIndicator } = useEditorComponents()
	if (!ShapeIndicator) return null

	return renderingShapes.map(({ id }) => (
		<ShapeIndicator key={id + '_indicator'} shapeId={id} hidden={!idsToDisplay.has(id)} />
	))
})
