import { StateNode, TLAnyShapeUtilConstructor, Tldraw, TLPointerEventInfo } from 'tldraw'
import { BezierCurveShapeUtil, MyBezierCurveShape } from './CubicBezierShape'
import { CustomHandles } from './CustomHandles'

const customShapes: TLAnyShapeUtilConstructor[] = [BezierCurveShapeUtil]

export default function BezierCurveShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// [7]
				components={{
					Handles: CustomHandles,
				}}
				shapeUtils={customShapes}
				onMount={(editor) => {
					editor.updateInstanceState({ isDebugMode: true })

					const viewportPageBounds = editor.getViewportPageBounds()
					const centerX = viewportPageBounds.center.x
					const centerY = viewportPageBounds.center.y

					editor.createShape({
						type: 'bezier-curve',
						x: centerX - 200,
						y: centerY - 150,
					})

					// [8]
					// Get state nodes with proper type safety
					const pointingHandleState = editor.getStateDescendant<StateNode>('select.pointing_handle')
					const editingShapeState = editor.getStateDescendant<StateNode>('select.editing_shape')

					if (!pointingHandleState) {
						throw new Error('SelectTool pointing_handle state not found')
					}
					if (!editingShapeState) {
						throw new Error('SelectTool editing_shape state not found')
					}

					// store original handlers with proper binding
					const originalHandlers = {
						pointingHandle: {
							onPointerMove: pointingHandleState.onPointerMove?.bind(pointingHandleState),
							onEnter: pointingHandleState.onEnter?.bind(pointingHandleState),
							onPointerUp: pointingHandleState.onPointerUp?.bind(pointingHandleState),
						},
						editingShape: {
							onPointerDown: editingShapeState.onPointerDown?.bind(editingShapeState),
							onPointerMove: editingShapeState.onPointerMove?.bind(editingShapeState),
						},
					}

					// collapse control points
					pointingHandleState.onEnter = (info: TLPointerEventInfo & { target: 'handle' }) => {
						if (!info.shape) return

						if (
							info.accelKey &&
							editor.isShapeOfType<MyBezierCurveShape>(info.shape, 'bezier-curve') &&
							info.target === 'handle'
						) {
							switch (info.handle.id) {
								case 'cp1': {
									editor.updateShape<MyBezierCurveShape>({
										id: info.shape.id,
										type: 'bezier-curve',
										props: {
											cp1: { x: info.shape.props.start.x, y: info.shape.props.start.y },
										},
									})

									editor.setEditingShape(info.shape.id)
									return
								}
								case 'cp2': {
									editor.updateShape<MyBezierCurveShape>({
										id: info.shape.id,
										type: 'bezier-curve',
										props: {
											cp2: { x: info.shape.props.end.x, y: info.shape.props.end.y },
										},
									})

									editor.setEditingShape(info.shape.id)
									return
								}
							}
						}

						originalHandlers.pointingHandle.onEnter?.(info, 'pointing_handle')
						return
					}

					// clicking on start or end point should not go to select.idle
					pointingHandleState.onPointerUp = (info: TLPointerEventInfo & { target: 'handle' }) => {
						if (!info.shape) return

						if (
							editor.isShapeOfType<MyBezierCurveShape>(info.shape, 'bezier-curve') &&
							info.target === 'handle'
						) {
							editor.setEditingShape(info.shape.id)
							return
						}
						originalHandlers.pointingHandle.onPointerUp?.(info)
					}

					// return to editing state after dragging a handle
					pointingHandleState.onPointerMove = (info: TLPointerEventInfo) => {
						if (!info.shape) return

						if (editor.isShapeOfType<MyBezierCurveShape>(info.shape, 'bezier-curve')) {
							editor.updateInstanceState({ isToolLocked: true })
							editor.setCurrentTool('select.dragging_handle', {
								...info,
								onInteractionEnd: () => {
									editor.setEditingShape(info.shape.id)
								},
							})
							return
						}

						originalHandlers.pointingHandle.onPointerMove?.(info)
					}

					// allow translating in editing state
					editingShapeState.onPointerMove = (info: TLPointerEventInfo) => {
						if (editor.inputs.isDragging) {
							const editingShape = editor.getEditingShape()
							if (
								editingShape &&
								editor.isShapeOfType<MyBezierCurveShape>(editingShape, 'bezier-curve')
							) {
								editor.updateInstanceState({ isToolLocked: true })

								editor.setCurrentTool('select.translating', {
									...info,
									target: 'shape',
									shape: editingShape,
									onInteractionEnd: () => {
										editor.setEditingShape(editingShape.id)
									},
								})
								return
							}
						}

						originalHandlers.editingShape.onPointerMove?.(info)
					}
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
