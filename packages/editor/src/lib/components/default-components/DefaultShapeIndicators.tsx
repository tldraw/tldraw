import { useValue } from '@tldraw/state-react'
import { TLShapeId } from '@tldraw/tlschema'
import { memo, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { useEditorComponents } from '../../hooks/useEditorComponents'

/** @public */
export interface TLShapeIndicatorsProps {
	/** Whether to hide all of the indicators */
	hideAll?: boolean
	/** Whether to show all of the indicators */
	showAll?: boolean
}

/** @public @react */
export const DefaultShapeIndicators = memo(function DefaultShapeIndicators({
	hideAll,
	showAll,
}: TLShapeIndicatorsProps) {
	const editor = useEditor()

	if (hideAll && showAll)
		throw Error('You cannot set both hideAll and showAll props to true, cmon now')

	const rPreviousSelectedShapeIds = useRef<Set<TLShapeId>>(new Set())

	const idsToDisplay = useValue(
		'should display selected ids',
		() => {
			const prev = rPreviousSelectedShapeIds.current
			const next = new Set<TLShapeId>()

			const instanceState = editor.getInstanceState()

			const isChangingStyle = instanceState.isChangingStyle

			// todo: this is tldraw specific and is duplicated at the tldraw layer. What should we do here instead?

			const isIdleOrEditing = editor.isInAny('select.idle', 'select.editing_shape')

			const isInSelectState = editor.isInAny(
				'select.brushing',
				'select.scribble_brushing',
				'select.pointing_shape',
				'select.pointing_selection',
				'select.pointing_handle'
			)

			// We hide all indicators if we're changing style or in certain interactions
			// todo: move this to some kind of Tool.hideIndicators property
			if (isChangingStyle || !(isIdleOrEditing || isInSelectState)) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			// We always want to show indicators for the selected shapes, if any
			for (const id of editor.getSelectedShapeIds()) {
				next.add(id)
			}

			// If we're idle or editing a shape, we want to also show an indicator for the hovered shape, if any
			if (isIdleOrEditing && instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
				const hovered = editor.getHoveredShapeId()
				if (hovered) next.add(hovered)
			}

			// Ok, has anything changed?

			// If the number of items in the set is different, then the selection has changed. This catches most changes.
			if (prev.size !== next.size) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			// Set difference check
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

	// Show indicators only for the shapes that are currently being rendered (ie that are on screen)
	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

	const { ShapeIndicator } = useEditorComponents()
	if (!ShapeIndicator) return null

	return renderingShapes.map(({ id }) => (
		<ShapeIndicator
			key={id + '_indicator'}
			shapeId={id}
			hidden={!showAll && (hideAll || !idsToDisplay.has(id))}
		/>
	))
})
