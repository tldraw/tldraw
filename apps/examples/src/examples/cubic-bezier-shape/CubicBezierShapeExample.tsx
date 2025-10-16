import { useEffect } from 'react'
import { StateNode, TLAnyShapeUtilConstructor, Tldraw, TLPointerEventInfo, useEditor } from 'tldraw'
import { BezierCurveShapeUtil, MyBezierCurveShape } from './CubicBezierShape'
import { CustomHandles } from './CustomHandles'

const customShapes: TLAnyShapeUtilConstructor[] = [BezierCurveShapeUtil]

export default function BezierCurveShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// [9]
				components={{
					Handles: CustomHandles,
					InFrontOfTheCanvas: () => {
						const editor = useEditor()
						useEffect(() => {
							function handleKeydown(e: KeyboardEvent) {
								if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
									const editingShape = editor.getEditingShape()
									if (!editingShape) return

									if (e.shiftKey) {
										editor.redo()
										editor.setEditingShape(editingShape)
									} else {
										editor.undo()
										editor.setEditingShape(editingShape)
									}
								}
							}

							window.addEventListener('keydown', handleKeydown)
							return () => {
								window.removeEventListener('keydown', handleKeydown)
							}
						}, [editor])
						return null
					},
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

					// [10]
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

[9]
Use custom ControlHandles component to show handles for bezier curves when editing, translating, or
dragging handles (not just in select.idle like default behavior).

[10]
Override state node methods to enable three custom interactions:
1. Meta + click on cp1/cp2 handles collapses them to their associated start/end points
2. After dragging any handle, stay in editing mode (instead of returning to select.idle)
3. Allow translating the curve while in editing mode by detecting drag and transitioning to select.translating

These overrides maintain the editing context, allowing fluid adjustments without losing handle visibility.
*/
