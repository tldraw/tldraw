import { useEditor, useEditorComponents, useValue } from '@tldraw/editor'
import { getArrowTargetState } from '../shapes/arrow/arrowTargetState'
import { DraggingHandle } from '../tools/SelectTool/childStates/DraggingHandle'
import { PointingHandle } from '../tools/SelectTool/childStates/PointingHandle'

/** @public @react */
export function TldrawOverlays() {
	const editor = useEditor()

	const shouldShowArrowHints = useValue(
		'should show arrow hints',
		() => {
			if (editor.isInAny('arrow.idle', 'arrow.pointing')) return true

			if (editor.isIn('select.pointing_handle')) {
				const node: PointingHandle = editor.getStateDescendant('select.pointing_handle')!
				if (
					node.info.shape.type === 'arrow' &&
					(node.info.handle.id === 'start' || node.info.handle.id === 'end')
				) {
					return true
				}
			}

			if (editor.isIn('select.dragging_handle')) {
				const node: DraggingHandle = editor.getStateDescendant('select.dragging_handle')!
				if (
					node.info.shape.type === 'arrow' &&
					(node.info.handle.id === 'start' || node.info.handle.id === 'end')
				) {
					return true
				}
			}

			return false
		},
		[editor]
	)

	if (!shouldShowArrowHints) return null

	return <TldrawArrowHints />
}

/** @public @react */
export function TldrawArrowHints() {
	const editor = useEditor()
	const { ShapeIndicator } = useEditorComponents()

	const targetInfo = useValue('arrow target info', () => getArrowTargetState(editor), [editor])

	if (!targetInfo) return null

	const { handlesInPageSpace, snap, anchorInPageSpace, arrowKind, isExact, isPrecise } = targetInfo

	const showEdgeHints = !isExact && arrowKind === 'elbow'

	return (
		<>
			{ShapeIndicator && <ShapeIndicator shapeId={targetInfo.target.id} />}

			{showEdgeHints && (
				<svg className="tl-overlays__item" aria-hidden="true">
					<circle
						cx={anchorInPageSpace.x}
						cy={anchorInPageSpace.y}
						className={`tl-arrow-hint-snap tl-arrow-hint-snap__${isPrecise ? (snap ?? 'none') : 'none'}`}
					/>

					{Object.entries(handlesInPageSpace).map(([side, handle]) => {
						if (!handle.isEnabled) return null
						return (
							<circle
								key={side}
								cx={handle.point.x}
								cy={handle.point.y}
								className="tl-arrow-hint-handle"
							/>
						)
					})}
				</svg>
			)}
		</>
	)
}
