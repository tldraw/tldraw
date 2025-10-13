import { StateNode, TLAnyShapeUtilConstructor, Tldraw, TLPointerEventInfo } from 'tldraw'
import { ControlHandles } from './ControlHandles'
import { BezierCurveShapeUtil, MyBezierCurveShape } from './CubicBezierShape'

const customShapes: TLAnyShapeUtilConstructor[] = [BezierCurveShapeUtil]

export default function BezierCurveShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// [7]
				components={{
					Handles: ControlHandles,
				}}
				shapeUtils={customShapes}
				onMount={(editor) => {
					const viewportPageBounds = editor.getViewportPageBounds()
					const centerX = viewportPageBounds.center.x
					const centerY = viewportPageBounds.center.y

					editor.createShape({
						type: 'bezier-curve',
						x: centerX - 200,
						y: centerY - 150,
					})

					// [8]
					type PointingHandle = StateNode & {
						onPointerMove(info: TLPointerEventInfo): void
					}

					const pointingHandleState =
						editor.getStateDescendant<PointingHandle>('select.pointing_handle')
					if (!pointingHandleState) throw Error('SelectTool PointingHandle state not found')

					const ogPointerMove = pointingHandleState.onPointerMove.bind(pointingHandleState)

					function onPointerMove(info: TLPointerEventInfo) {
						if (!info.shape) return

						const { shape } = info

						if (editor.isShapeOfType<MyBezierCurveShape>(shape, 'bezier-curve')) {
							editor.updateInstanceState({ isToolLocked: true })
							editor.setCurrentTool('select.dragging_handle', {
								...info,
								onInteractionEnd: () => {
									// noop, stay in this state
									editor.setEditingShape(shape.id) // go back to editing mode
								},
							})
							return
						}
						ogPointerMove(info)
					}

					const defaultOnEnter = pointingHandleState?.onEnter?.bind(pointingHandleState)

					function onEnter(info: TLPointerEventInfo & { target: 'handle' }, from: string) {
						if (!info) return

						const { shape } = info

						if (
							editor.isShapeOfType<MyBezierCurveShape>(shape, 'bezier-curve') &&
							editor.inputs.metaKey
						) {
							switch (info.handle.id) {
								case 'cp1':
									{
										editor.updateShapes([
											{
												...shape,
												props: {
													cp1: { x: shape.props.start.x, y: shape.props.start.y },
												},
											},
										])
									}
									break
								case 'cp2':
									{
										editor.updateShapes([
											{
												...shape,
												props: {
													cp2: { x: shape.props.end.x, y: shape.props.end.y },
												},
											},
										])
									}
									break
							}

							editor.setEditingShape(shape.id)
							return
						}

						if (!defaultOnEnter) return
						defaultOnEnter(info, from)
					}

					pointingHandleState.onPointerMove = onPointerMove
					pointingHandleState.onEnter = onEnter
				}}
			/>
		</div>
	)
}

/*
Introduction:
This example demonstrates how to create a cubic bezier curve shape with interactive handles.

[7]
Use custom ControlHandles component to control handle visibility based on editor state.

[8]
Override two original methods of pointing_handle to keep the shape in editing mode after dragging handles,
allowing continuous handle adjustments, and to collapse control points when clicking on them with the meta/cmd key.
*/
