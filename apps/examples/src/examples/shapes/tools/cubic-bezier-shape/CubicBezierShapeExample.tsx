import {
	createShapeId,
	Tldraw,
	type Editor,
	type StateNode,
	type TLAnyOverlayUtilConstructor,
	type TLAnyShapeUtilConstructor,
	type TLHandle,
	type TLOverlay,
	type TLPointerEventInfo,
	type TLShapeId,
} from 'tldraw'
import { BezierShapeHandleOverlayUtil } from './BezierShapeHandleOverlayUtil'
import { BezierCurveShapeUtil } from './CubicBezierShape'
import { SneakyUndoRedoWhileEditing } from './SneakyUndoRedoWhileEditing'

const customShapes: TLAnyShapeUtilConstructor[] = [BezierCurveShapeUtil]

type ShapeHandleOverlay = TLOverlay<{ shapeId: TLShapeId; handle: TLHandle }>

type PointingHandleState = StateNode & {
	info?: TLPointerEventInfo & { target: 'handle' }
}

function getPointingHandleInfo(
	state: PointingHandleState,
	fallback?: TLPointerEventInfo
): (TLPointerEventInfo & { target: 'handle' }) | undefined {
	if (state.info?.target === 'handle') return state.info
	if (fallback?.target === 'handle') return fallback
	return undefined
}

const customOverlays: TLAnyOverlayUtilConstructor[] = [BezierShapeHandleOverlayUtil]

function startEditingBezierShape(editor: Editor, id: TLShapeId) {
	editor.setEditingShape(id)
	editor.setCurrentTool('select.editing_shape')
}

function getBezierHandleOverlayAtPoint(editor: Editor): ShapeHandleOverlay | null {
	const overlay = editor.overlays.getOverlayAtPoint(
		editor.inputs.getCurrentPagePoint(),
		editor.options.hitTestMargin / editor.getZoomLevel()
	)
	if (!overlay || overlay.type !== 'shape_handle') return null

	const shapeHandleOverlay = overlay as ShapeHandleOverlay
	const shape = editor.getShape(shapeHandleOverlay.props.shapeId)
	if (!shape || !editor.isShapeOfType(shape, 'bezier-curve')) return null

	return shapeHandleOverlay
}

function updateHoveredBezierHandle(editor: Editor) {
	const editingShape = editor.getEditingShape()
	if (!editingShape || !editor.isShapeOfType(editingShape, 'bezier-curve')) return false

	const overlay = getBezierHandleOverlayAtPoint(editor)
	const previousOverlayId = editor.overlays.getHoveredOverlayId()

	if (overlay) {
		editor.overlays.setHoveredOverlay(overlay.id)
		editor.setHoveredShape(null)

		const cursor = editor.overlays.getOverlayUtil(overlay).getCursor(overlay)
		if (cursor) {
			editor.setCursor({ type: cursor, rotation: editor.getSelectionRotation() })
		}

		return true
	}

	if (previousOverlayId) {
		editor.setCursor({ type: 'default', rotation: 0 })
	}

	editor.overlays.setHoveredOverlay(null)
	return false
}

export default function BezierCurveShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				// [1]
				overlayUtils={customOverlays}
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
					startEditingBezierShape(editor, id)

					// [2]
					const pointingHandleState =
						editor.getStateDescendant<PointingHandleState>('select.pointing_handle')
					const editingShapeState = editor.getStateDescendant<StateNode>('select.editing_shape')

					if (!pointingHandleState) {
						throw new Error('SelectTool pointing_handle state not found')
					}
					if (!editingShapeState) {
						throw new Error('SelectTool editing_shape state not found')
					}

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
					pointingHandleState.onPointerUp = (info: TLPointerEventInfo) => {
						const handleInfo = getPointingHandleInfo(pointingHandleState, info)
						if (!handleInfo) {
							originalHandlers.pointingHandle.onPointerUp?.(info)
							return
						}

						if (
							handleInfo.accelKey &&
							editor.isShapeOfType(handleInfo.shape, 'bezier-curve') &&
							handleInfo.target === 'handle'
						) {
							switch (handleInfo.handle.id) {
								case 'cp1': {
									editor.updateShape({
										id: handleInfo.shape.id,
										type: 'bezier-curve',
										props: {
											cp1: {
												x: handleInfo.shape.props.start.x,
												y: handleInfo.shape.props.start.y,
											},
										},
									})

									startEditingBezierShape(editor, handleInfo.shape.id)
									return
								}
								case 'cp2': {
									editor.updateShape({
										id: handleInfo.shape.id,
										type: 'bezier-curve',
										props: {
											cp2: { x: handleInfo.shape.props.end.x, y: handleInfo.shape.props.end.y },
										},
									})

									startEditingBezierShape(editor, handleInfo.shape.id)
									return
								}
							}
						}

						if (
							editor.isShapeOfType(handleInfo.shape, 'bezier-curve') &&
							handleInfo.target === 'handle'
						) {
							startEditingBezierShape(editor, handleInfo.shape.id)
							return
						}

						originalHandlers.pointingHandle.onPointerUp?.(info)
					}

					// return to editing state after dragging a handle
					pointingHandleState.onPointerMove = (info: TLPointerEventInfo) => {
						if (!editor.inputs.getIsDragging()) {
							originalHandlers.pointingHandle.onPointerMove?.(info)
							return
						}

						const handleInfo = getPointingHandleInfo(pointingHandleState, info)
						if (!handleInfo) {
							originalHandlers.pointingHandle.onPointerMove?.(info)
							return
						}

						if (editor.isShapeOfType(handleInfo.shape, 'bezier-curve')) {
							editor.updateInstanceState({ isToolLocked: true })
							editor.setCurrentTool('select.dragging_handle', {
								...handleInfo,
								onInteractionEnd: () => {
									startEditingBezierShape(editor, handleInfo.shape.id)
								},
							})
							return
						}

						originalHandlers.pointingHandle.onPointerMove?.(info)
					}

					editingShapeState.onPointerDown = (info: TLPointerEventInfo) => {
						const editingShape = editor.getEditingShape()
						if (editingShape && editor.isShapeOfType(editingShape, 'bezier-curve')) {
							const overlay = getBezierHandleOverlayAtPoint(editor)

							if (overlay) {
								editor.setCurrentTool('select.pointing_handle', {
									...info,
									target: 'handle',
									shape: editingShape,
									handle: overlay.props.handle,
								})
								return
							}
						}

						originalHandlers.editingShape.onPointerDown?.(info)
					}

					// allow translating in editing state
					editingShapeState.onPointerMove = (info: TLPointerEventInfo) => {
						if (updateHoveredBezierHandle(editor) && !editor.inputs.getIsDragging()) return

						if (editor.inputs.getIsDragging()) {
							const editingShape = editor.getEditingShape()
							if (editingShape && editor.isShapeOfType(editingShape, 'bezier-curve')) {
								editor.updateInstanceState({ isToolLocked: true })

								editor.setCurrentTool('select.translating', {
									...info,
									target: 'shape',
									shape: editingShape,
									onInteractionEnd: () => {
										startEditingBezierShape(editor, editingShape.id)
									},
								})
								return
							}
						}

						originalHandlers.editingShape.onPointerMove?.(info)
					}
				}}
			>
				{/* [3] */}
				<SneakyUndoRedoWhileEditing />
			</Tldraw>
		</div>
	)
}

/*
Introduction:
This example creates a cubic bezier curve shape with draggable handles. The shape itself lives
in CubicBezierShape.tsx; this file wires up the editor so the curve stays in its editing state
while its handles are dragged.

[1]
The default shape handle overlay only shows handles in select.idle and select.pointing_handle.
BezierShapeHandleOverlayUtil replaces it (same `type`, 'shape_handle') and also shows handles
for bezier curves while they're being edited or while a handle is being dragged, so the handles
don't disappear mid-interaction. Other shapes fall through to the default behaviour.

[2]
The select tool's child states normally return to select.idle after a handle drag, which would
end editing. Rather than fork the whole select tool, we grab the state nodes with
`getStateDescendant` and wrap their event handlers, delegating back to the originals for any
shape that isn't a bezier curve. The wrapped handlers add three interactions:
1. Cmd/ctrl + click on a cp1/cp2 handle collapses it onto its start/end point.
2. After dragging any handle, return to select.editing_shape instead of select.idle.
3. Dragging the curve itself while editing translates it, then returns to editing.
Patching state nodes like this is a workaround, not a supported API: it depends on the select
tool's internal state ids and event flow.

[3]
Undo/redo shortcuts are ignored while a shape is being edited, because for text shapes the text
editor owns them. SneakyUndoRedoWhileEditing listens for cmd/ctrl+z at the window level and
restores the editing shape afterwards. It's a hack, but a small one.
*/
