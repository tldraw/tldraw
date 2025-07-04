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
			if (hideAll) {
				return prev
			}

			const path = editor.getPath()
			const nodeIds = path.split('.')
			for (let i = 0; i < nodeIds.length; i++) {
				const subpath = nodeIds.slice(0, i).join('.')
				const stateNode = editor.getStateDescendant(subpath)
				if (!stateNode?.getShouldShowIndicators()) {
					return prev
				}
			}

			const next = new Set<TLShapeId>()

			const instanceState = editor.getInstanceState()

			const isChangingStyle = instanceState.isChangingStyle

			// We hide all indicators if we're changing style or in certain interactions
			if (isChangingStyle) {
				rPreviousSelectedShapeIds.current = next
				return next
			}

			// We always want to show indicators for the selected shapes, if any
			for (const id of editor.getSelectedShapeIds()) {
				next.add(id)
			}

			// If we're idle or editing a shape, we want to also show an indicator for the hovered shape, if any
			if (instanceState.isHoveringCanvas && !instanceState.isCoarsePointer) {
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

	const renderingShapes = useValue('rendering shapes', () => editor.getRenderingShapes(), [editor])

	const { ShapeIndicator } = useEditorComponents()
	if (!ShapeIndicator) return null

	// Render indicators for all of the rendering shapes, but only show indicators for the shapes that
	// are in the idsToDisplay set. (Hidden indicators will not be displayed, though they will be mounted,
	// because it's slow as hell to mount and unmount lots of things in React.

	return renderingShapes.map(({ id }) => (
		<ShapeIndicator
			key={id + '_indicator'}
			shapeId={id}
			hidden={!showAll && (hideAll || !idsToDisplay.has(id))}
		/>
	))
})
