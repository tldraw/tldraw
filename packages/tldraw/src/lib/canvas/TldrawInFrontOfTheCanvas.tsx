import { Editor, modulate, toDomPrecision, useEditor, useEditorComponents } from '@tldraw/editor'
import { track, useQuickReactor, useValue } from '@tldraw/state-react'
import { Fragment, useState } from 'react'
import { getArrowTargetState } from '../shapes/arrow/arrowTarget'
import { DraggingHandle } from '../tools/SelectTool/childStates/DraggingHandle'
import { PointingHandle } from '../tools/SelectTool/childStates/PointingHandle'

export const TldrawInFrontOfTheCanvas = track(function TldrawOverlays() {
	const editor = useEditor()
	const [htmlLayer, setHtmlLayer] = useState<HTMLDivElement | null>(null)

	useQuickReactor(
		'position html layer',
		() => {
			if (!htmlLayer) return

			const { x, y, z } = editor.getCamera()

			// Because the html container has a width/height of 1px, we
			// need to create a small offset when zoomed to ensure that
			// the html container and svg container are lined up exactly.
			const offset =
				z >= 1 ? modulate(z, [1, 8], [0.125, 0.5], true) : modulate(z, [0.1, 1], [-2, 0.125], true)

			const transform = `scale(${toDomPrecision(z)}) translate(${toDomPrecision(
				x + offset
			)}px,${toDomPrecision(y + offset)}px)`

			htmlLayer.style.setProperty('transform', transform)
		},
		[editor, htmlLayer]
	)

	if (!shouldShowArrowHints(editor)) return null

	return (
		<div ref={setHtmlLayer} className="tl-html-layer tl-overlays">
			<TldrawArrowHints />
		</div>
	)
})

export const TldrawArrowHints = track(function TldrawArrowHints() {
	const editor = useEditor()
	const { ShapeIndicator } = useEditorComponents()

	const targetInfo = useValue('arrow target info', () => getArrowTargetState(editor), [editor])

	if (!targetInfo) return null

	const { handlesInPageSpace, snap, anchorInPageSpace, arrowKind, isExact } = targetInfo
	const showEdgeHints = !isExact && arrowKind === 'elbow'
	const showOutline = !showEdgeHints || snap === 'center' || snap === 'edge' || snap === 'none'

	return (
		<>
			{showOutline && ShapeIndicator && <ShapeIndicator shapeId={targetInfo.target.id} />}

			{showEdgeHints && (
				<svg className="tl-user-arrow-hints tl-overlays__item">
					<circle
						cx={anchorInPageSpace.x}
						cy={anchorInPageSpace.y}
						className={`tl-arrow-hint-snap tl-arrow-hint-snap__${snap ?? 'none'}`}
					/>

					{Object.entries(handlesInPageSpace).map(([side, handle]) => {
						if (!handle.isEnabled) return null
						return (
							<Fragment key={side}>
								{/* {side ==r= snap.side && (
									<circle
										cx={handle.point.x}
										cy={handle.point.y}
										className="tl-arrow-hint-handle__active"
									/>
								)} */}
								<circle cx={handle.point.x} cy={handle.point.y} className="tl-arrow-hint-handle" />
							</Fragment>
						)
					})}
				</svg>
			)}
		</>
	)
})

function shouldShowArrowHints(editor: Editor) {
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
}
