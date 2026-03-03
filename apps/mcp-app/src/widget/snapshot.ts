import type { TLBindingCreate, TLShape, TLShapeId } from 'tldraw'
import { Box, Editor, structuredClone } from 'tldraw'
import type { CanvasSnapshot } from './persistence'

/**
 * Re-run each ShapeUtil's onBeforeCreate to recalculate auto-sizing dimensions
 * (e.g. growY for geo/note shapes). This compensates for shapes arriving from
 * the server with static dimensions (growY: 0) that get applied via updateShapes,
 * which doesn't trigger the sizing recalculation in onBeforeUpdate unless
 * text/font/size actually changed.
 */
function forceAutoSize(editor: Editor) {
	const updates: TLShape[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		const util = editor.getShapeUtil(shape)
		const adjusted = util.onBeforeCreate?.(shape as any)
		if (adjusted) {
			updates.push(adjusted as TLShape)
		}
	}
	if (updates.length > 0) {
		editor.updateShapes(updates)
	}
}

/**
 * Create bindings on the editor from a list of TLBindingCreate objects.
 * Only creates bindings where the target shape exists on the page.
 * Removes existing arrow bindings for affected arrows to prevent duplicates.
 */
function applyBindings(editor: Editor, bindings: TLBindingCreate[]) {
	if (bindings.length === 0) return

	// Collect arrow shape IDs that have bindings to dedup
	const arrowIds = new Set(bindings.map((b) => b.fromId))
	for (const arrowId of arrowIds) {
		const existing = editor.getBindingsFromShape(arrowId, 'arrow')
		if (existing.length > 0) {
			editor.deleteBindings(existing)
		}
	}

	for (const binding of bindings) {
		if (editor.getShape(binding.toId)) {
			editor.createBinding(binding)
		}
	}
}

export const CAMERA_ANIM_MS = 300
let cameraAnimEndTime = 0

/**
 * If any of the given shape IDs extend outside the current viewport,
 * pan (and only zoom out if necessary) to keep them visible.
 * Never zooms in beyond the current zoom level.
 * Skips the call if a previous animation is still playing.
 */
export function zoomToFitRequestShapes(editor: Editor, shapeIds: Set<TLShapeId>) {
	if (shapeIds.size === 0) return

	// Don't interrupt an in-progress animation — wait for it to finish
	if (Date.now() < cameraAnimEndTime) return

	const shapeBounds: Box[] = []
	for (const id of shapeIds) {
		const bounds = editor.getShapePageBounds(id)
		if (bounds) shapeBounds.push(bounds)
	}
	if (shapeBounds.length === 0) return

	const commonBounds = Box.Common(shapeBounds)
	const viewportBounds = editor.getViewportPageBounds()

	// All request shapes already visible — nothing to do
	const contained =
		commonBounds.x >= viewportBounds.x &&
		commonBounds.y >= viewportBounds.y &&
		commonBounds.x + commonBounds.w <= viewportBounds.x + viewportBounds.w &&
		commonBounds.y + commonBounds.h <= viewportBounds.y + viewportBounds.h
	if (contained) return

	const currentZoom = editor.getZoomLevel()
	const screenBounds = editor.getViewportScreenBounds()
	const inset = 100

	// The zoom level needed to fit the shapes with padding
	const fitZoomX =
		commonBounds.w > 0 ? (screenBounds.w - inset) / commonBounds.w : Number.POSITIVE_INFINITY
	const fitZoomY =
		commonBounds.h > 0 ? (screenBounds.h - inset) / commonBounds.h : Number.POSITIVE_INFINITY
	const fitZoom = Math.min(fitZoomX, fitZoomY)

	// Never zoom in past the current level — only zoom out if shapes don't fit
	const zoom = Math.min(currentZoom, fitZoom)
	if (!Number.isFinite(zoom) || zoom <= 0) return

	// Center the shapes in the viewport at the chosen zoom
	const cx = commonBounds.x + commonBounds.w / 2
	const cy = commonBounds.y + commonBounds.h / 2
	const cameraX = -cx + screenBounds.w / zoom / 2
	const cameraY = -cy + screenBounds.h / zoom / 2
	if (!Number.isFinite(cameraX) || !Number.isFinite(cameraY)) return

	cameraAnimEndTime = Date.now() + CAMERA_ANIM_MS

	editor.setCamera(
		{
			x: cameraX,
			y: cameraY,
			z: zoom,
		},
		{ animation: { duration: CAMERA_ANIM_MS } }
	)
}

export function applySnapshot(editor: Editor, snapshot: CanvasSnapshot) {
	const nextShapes = snapshot.shapes.map((shape) => structuredClone(shape))
	const nextAssets = (snapshot.assets ?? []).map((asset) => structuredClone(asset))
	const nextBindings = (snapshot.bindings ?? []) as TLBindingCreate[]

	editor.store.mergeRemoteChanges(() => {
		editor.run(
			() => {
				// Restore asset records first so image shapes can resolve them
				if (nextAssets.length > 0) {
					const existingAssetIds = new Set(editor.getAssets().map((a) => a.id))
					for (const asset of nextAssets) {
						if (!existingAssetIds.has(asset.id)) {
							editor.createAssets([asset])
						}
					}
				}

				const existingIds = [...editor.getCurrentPageShapeIds()]
				if (existingIds.length > 0) {
					editor.deleteShapes(existingIds)
				}
				if (nextShapes.length <= 0) return

				// Preserve parent relationships while allowing the editor to assign fresh indices.
				const createInputs = nextShapes.map((shape) => {
					const { index: _index, ...partial } = shape
					return partial
				})
				editor.createShapes(createInputs)

				// Re-run auto-sizing so growY / fontSizeAdjustment are correct
				forceAutoSize(editor)

				// Create bindings after all shapes are on the page
				applyBindings(editor, nextBindings)
			},
			{ history: 'ignore' }
		)
	})
}

/**
 * Non-destructive preview apply: adds new shapes and updates existing ones
 * without deleting user-drawn shapes. Only removes committed shapes that
 * are absent from the preview (e.g. when createFromBlank clears the canvas).
 */
export function applyPreviewToEditor(
	editor: Editor,
	snapshot: CanvasSnapshot,
	committedSnapshot: CanvasSnapshot
) {
	const nextShapes = snapshot.shapes.map((shape) => structuredClone(shape))
	const nextShapeIds = new Set(nextShapes.map((s) => s.id))
	const committedIds = new Set(committedSnapshot.shapes.map((s) => s.id))
	const nextBindings = (snapshot.bindings ?? []) as TLBindingCreate[]

	editor.store.mergeRemoteChanges(() => {
		editor.run(
			() => {
				const existingIds = [...editor.getCurrentPageShapeIds()]
				const toDelete = existingIds.filter((id) => committedIds.has(id) && !nextShapeIds.has(id))
				if (toDelete.length > 0) {
					editor.deleteShapes(toDelete)
				}

				if (nextShapes.length <= 0) return

				const remainingIds = new Set([...editor.getCurrentPageShapeIds()])

				const toCreate: TLShape[] = []
				const toUpdate: TLShape[] = []

				for (const shape of nextShapes) {
					if (remainingIds.has(shape.id)) {
						toUpdate.push(shape)
					} else {
						const { index: _index, ...partial } = shape
						toCreate.push(partial as TLShape)
					}
				}

				if (toUpdate.length > 0) editor.updateShapes(toUpdate)
				if (toCreate.length > 0) editor.createShapes(toCreate)

				// Re-run auto-sizing so growY / fontSizeAdjustment are correct
				forceAutoSize(editor)

				// Create bindings after all shapes are on the page
				applyBindings(editor, nextBindings)
			},
			{ history: 'ignore' }
		)
	})
}
