import {
	createShapeId,
	StateNode,
	TLAnyShapeUtilConstructor,
	Tldraw,
	TLPointerEventInfo,
} from 'tldraw'
import { BezierCurveShapeUtil } from './CubicBezierShape'
import { CustomHandles } from './CustomHandles'
import { SneakyUndoRedoWhileEditing } from './SneakyUndoRedoWhileEditing'

const customShapes: TLAnyShapeUtilConstructor[] = [BezierCurveShapeUtil]

export default function BezierCurveShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// [9]
				components={{
					Handles: CustomHandles,
				}}
				shapeUtils={customShapes}
				onMount={(editor) => {
					editor.user.updateUserPreferences({ isSnapMode: true })

					const viewportPageBounds = editor.getViewportPageBounds()
					const centerX = viewportPageBounds.center.x
					const centerY = viewportPageBounds.center.y

					const id = createShapeId()
					editor.createShape({
						id,
						type: 'bezier-curve',
						x: centerX - 200,
						y: centerY - 150,
					})

					// Select and edit the shape on appear
					editor.select(id)
					editor.setEditingShape(id)

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
							onPointerUp: pointingHandleState.onPointerUp?.bind(pointingHandleState),
						},
						editingShape: {
							onPointerDown: editingShapeState.onPointerDown?.bind(editingShapeState),
							onPointerMove: editingShapeState.onPointerMove?.bind(editingShapeState),
						},
					}

					// clicking on start or end point should not go to select.idle
					pointingHandleState.onPointerUp = (info: TLPointerEventInfo & { target: 'handle' }) => {
						if (!info.shape) return

						if (
							info.accelKey &&
							editor.isShapeOfType(info.shape, 'bezier-curve') &&
							info.target === 'handle'
						) {
							switch (info.handle.id) {
								case 'cp1': {
									editor.updateShape({
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
									editor.updateShape({
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

						if (editor.isShapeOfType(info.shape, 'bezier-curve') && info.target === 'handle') {
							editor.setEditingShape(info.shape.id)
							return
						}

						originalHandlers.pointingHandle.onPointerUp?.(info)
					}

					// return to editing state after dragging a handle
					pointingHandleState.onPointerMove = (info: TLPointerEventInfo) => {
						if (!info.shape) return

						if (editor.isShapeOfType(info.shape, 'bezier-curve')) {
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
						if (editor.inputs.getIsDragging()) {
							const editingShape = editor.getEditingShape()
							if (editingShape && editor.isShapeOfType(editingShape, 'bezier-curve')) {
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
			>
				{/* 11 */}
				<SneakyUndoRedoWhileEditing />
			</Tldraw>
		</div>
	)
}

/*
Introduction:
This example demonstrates how to create a cubic bezier curve shape with interactive handles.

[9]
Use custom ControlHandles component to show handles for bezier curves when editing, translating, or
dragging handles.

[10]
Override state node methods to enable three custom interactions:
1. Meta + click on cp1/cp2 handles collapses them to their associated start/end points
2. After dragging any handle, stay in editing mode (instead of returning to select.idle)
3. Allow translating the curve while in editing mode by detecting drag and transitioning to select.translating

[11]
Add a sneaky undo/redo while editing. This is a hack to allow undo/redo while editing a shape.
It's not a perfect solution, but it's a workaround for the fact that tldraw doesn't support
undo/redo while editing a shape. Sometimes you gotta hack it.

These overrides maintain the editing context, allowing fluid adjustments without losing handle visibility.
*/
