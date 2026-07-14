import {
	EASINGS,
	Editor,
	TLDefaultColorStyle,
	TLDrawShape,
	TLGeoShape,
	TLLineShape,
	TLShape,
	TLShapeId,
	TLShapePartial,
	VecLike,
	createShapeId,
	getIndices,
} from '@tldraw/editor'

/** The opacity of magic wand ink while a stroke is in progress. */
export const MAGIC_WAND_INK_OPACITY = 0.5

/**
 * The colour the ink turns while a stroke would resolve to a lasso selection.
 * Draw shapes can only use palette colours, so this is the closest match to the
 * selection highlight rather than the exact selection colour.
 */
export const MAGIC_WAND_LASSO_COLOR: TLDefaultColorStyle = 'blue'

/** The colour the ink turns while a scribble over shapes would delete them on release. */
export const MAGIC_WAND_DELETE_COLOR: TLDefaultColorStyle = 'red'

/**
 * Class toggled on the editor container while a magic wand stroke is in progress.
 * A CSS rule keyed on this class (see ui.css) adds a colour transition to draw
 * shapes so the live tint preview animates. Keep in sync with ui.css.
 */
export const MAGIC_WAND_INKING_CLASS = 'tl-magic-wand-inking'

/** How long the "ink drying" fade-to-solid takes after drawing, in ms. */
const INK_DRY_DURATION_MS = 350

/** How long the lasso ink takes to fade away after selecting, in ms. */
const LASSO_FADE_DURATION_MS = 300

/** Opacity the hold "charging" preview ramps up to while the morph is pending. */
const MORPH_PREVIEW_OPACITY = 0.4

/** How long a scribble-delete overlay takes to fade in to translucent red (matches the scribble tint). */
const DELETE_OVERLAY_FADE_IN_MS = 150

/** How long the sketch→shape crossfade takes when a morph fires, in ms. */
const MORPH_FADE_DURATION_MS = 250

/**
 * Shows the in-progress stroke at half opacity by lowering the shape's real
 * `opacity`. The write is history-ignored, so undo/redo never replay it, but it
 * does reach the store — which is the point: collaborators receive the record,
 * so they see the translucent "wet ink" too (a CSS-only effect would render as
 * a solid stroke on other clients). The natural opacity is restored by
 * {@link dryWetInk} or {@link clearWetInk}; strokes consumed by a gesture are
 * bailed away entirely and need no restore. No fade-in here, so the stroke
 * appears translucent immediately.
 */
export function setWetInk(editor: Editor, shapeIds: TLShapeId[]) {
	if (shapeIds.length === 0) return
	editor.run(
		() => {
			for (const id of shapeIds) {
				const shape = editor.getShape(id)
				if (!shape || shape.opacity === MAGIC_WAND_INK_OPACITY) continue
				editor.updateShape({ id, type: shape.type, opacity: MAGIC_WAND_INK_OPACITY })
			}
		},
		{ history: 'ignore' }
	)
}

/**
 * Eases the stroke back to its natural opacity — a quick "ink drying" effect —
 * using the same history-ignored tween as the ghosts, so collaborators watch
 * the ink dry as well.
 *
 * Called while the gesture's undo entry is still open. The natural opacity is
 * first committed with a recorded write: the draw tool's own recorded updates
 * squash the whole record (including the ignored wet opacity) into the entry,
 * so without this a redo would resurrect the stroke translucent. The record is
 * then dipped back down (ignored) in the same tick — no visible pop — and the
 * tween carries it home.
 */
export function dryWetInk(editor: Editor, shapeIds: TLShapeId[], naturalOpacity: number) {
	if (shapeIds.length === 0) return
	editor.run(() => {
		for (const id of shapeIds) {
			const shape = editor.getShape(id)
			if (!shape) continue
			editor.updateShape({ id, type: shape.type, opacity: naturalOpacity })
		}
	})
	setWetInk(editor, shapeIds)
	for (const id of shapeIds) {
		animateShapeOpacity(editor, id, MAGIC_WAND_INK_OPACITY, naturalOpacity, INK_DRY_DURATION_MS)
	}
}

/**
 * Restores the stroke's natural opacity immediately (e.g. on cancel or exit).
 * Skips shapes that no longer exist — gesture strokes are usually bailed away
 * before this runs.
 */
export function clearWetInk(editor: Editor, shapeIds: TLShapeId[], naturalOpacity: number) {
	editor.run(
		() => {
			for (const id of shapeIds) {
				const shape = editor.getShape(id)
				if (!shape || shape.opacity === naturalOpacity) continue
				editor.updateShape({ id, type: shape.type, opacity: naturalOpacity })
			}
		},
		{ history: 'ignore' }
	)
}

/**
 * Animates a shape's opacity from `from` to `to` over `durationMs`, using
 * history-ignored updates so the tween never pollutes the undo stack. Stops
 * early if the shape disappears. Runs on the editor's timers so it's cleaned up
 * when the editor is disposed.
 */
function animateShapeOpacity(
	editor: Editor,
	shapeId: TLShapeId,
	from: number,
	to: number,
	durationMs: number,
	onDone?: () => void
) {
	let startTime: number | null = null

	const frame: FrameRequestCallback = (time) => {
		if (startTime === null) startTime = time

		const shape = editor.getShape(shapeId)
		if (!shape) {
			onDone?.()
			return
		}

		const t = durationMs <= 0 ? 1 : Math.min(1, (time - startTime) / durationMs)
		const opacity = from + (to - from) * EASINGS.easeOutCubic(t)
		// `ignoreShapeLock` so we can keep animating the (locked) ghost.
		editor.run(() => editor.updateShape({ id: shapeId, type: shape.type, opacity }), {
			history: 'ignore',
			ignoreShapeLock: true,
		})

		if (t < 1) {
			editor.timers.requestAnimationFrame(frame)
		} else {
			onDone?.()
		}
	}

	editor.timers.requestAnimationFrame(frame)
}

/**
 * Fades out and removes a throwaway copy of a finished stroke. The copy is
 * created and destroyed with history ignored, so it's purely visual and never
 * undoable. We defer creation by a frame so the committed post-gesture state
 * stays clean. `color` defaults to the stroke's own colour (used by the morph
 * crossfade); the lasso passes the selection colour.
 */
export function fadeOutInkGhost(
	editor: Editor,
	inkSnapshot: TLDrawShape,
	color: TLDefaultColorStyle = inkSnapshot.props.color
) {
	editor.timers.requestAnimationFrame(() => {
		const ghostId = createShapeId()

		editor.run(
			() => {
				editor.createShape<TLDrawShape>({
					id: ghostId,
					type: 'draw',
					// Locked so the fading ink can't be clicked, selected, or moved
					// while it's on screen — it's a visual effect, not content.
					isLocked: true,
					x: inkSnapshot.x,
					y: inkSnapshot.y,
					rotation: inkSnapshot.rotation,
					opacity: MAGIC_WAND_INK_OPACITY,
					props: { ...inkSnapshot.props, color, isComplete: true },
					meta: { magicWandGhost: true },
				})
			},
			{ history: 'ignore' }
		)

		animateShapeOpacity(editor, ghostId, MAGIC_WAND_INK_OPACITY, 0, LASSO_FADE_DURATION_MS, () => {
			editor.run(() => editor.deleteShape(ghostId), { history: 'ignore', ignoreShapeLock: true })
		})
	})
}

/**
 * Shows a translucent-red overlay for a shape the scribble has marked for
 * deletion, fading it in so the element appears to fade to translucent red the
 * same way the scribble ink does. The overlay is a locked, history-ignored clone
 * of the shape forced to the delete colour (and filled where it has a fill), so
 * it's purely a visual effect. Returns its id; remove it with
 * {@link fadeOutDeleteOverlay} (on delete) or {@link removeMorphPreview} (on cancel).
 */
export function showDeleteOverlay(editor: Editor, shape: TLShape): TLShapeId {
	const ghostId = createShapeId()
	const props = { ...(shape.props as Record<string, unknown>) }
	props.color = MAGIC_WAND_DELETE_COLOR
	if (props.fill === 'none') props.fill = 'solid'
	editor.run(
		() => {
			editor.createShape({
				id: ghostId,
				type: shape.type,
				x: shape.x,
				y: shape.y,
				rotation: shape.rotation,
				isLocked: true,
				opacity: 0,
				meta: { magicWandGhost: true },
				props,
			} as TLShapePartial)
		},
		{ history: 'ignore' }
	)
	animateShapeOpacity(editor, ghostId, 0, MAGIC_WAND_INK_OPACITY, DELETE_OVERLAY_FADE_IN_MS)
	return ghostId
}

/** Fades a scribble-delete overlay out from its current opacity and removes it. */
export function fadeOutDeleteOverlay(editor: Editor, ghostId: TLShapeId) {
	const shape = editor.getShape(ghostId)
	if (!shape) return
	animateShapeOpacity(editor, ghostId, shape.opacity, 0, LASSO_FADE_DURATION_MS, () => {
		editor.run(() => editor.deleteShape(ghostId), { history: 'ignore', ignoreShapeLock: true })
	})
}

/** The geo shape params the hold preview / morph need (page space). */
export interface MorphPreviewShape {
	geo: TLGeoShape['props']['geo']
	x: number
	y: number
	w: number
	h: number
	rotation: number
	color: TLDefaultColorStyle
}

/**
 * Shows the hold "charging" preview: a locked, ephemeral, outline-only geo shape
 * at the recognized location whose opacity ramps up over `durationMs` so the user
 * sees a morph is imminent. History-ignored, so it never touches the document.
 * Returns its id; pass it to {@link removeMorphPreview}.
 */
export function showMorphPreview(
	editor: Editor,
	shape: MorphPreviewShape,
	durationMs: number
): TLShapeId {
	const ghostId = createShapeId()
	editor.run(
		() => {
			editor.createShape<TLGeoShape>({
				id: ghostId,
				type: 'geo',
				isLocked: true,
				x: shape.x,
				y: shape.y,
				rotation: shape.rotation,
				opacity: 0,
				props: { geo: shape.geo, w: shape.w, h: shape.h, color: shape.color, fill: 'none' },
				meta: { magicWandGhost: true },
			})
		},
		{ history: 'ignore' }
	)
	animateShapeOpacity(editor, ghostId, 0, MORPH_PREVIEW_OPACITY, durationMs)
	return ghostId
}

/**
 * Shows the hold "charging" preview for a line morph: a locked, ephemeral line at
 * the recognized endpoints whose opacity ramps up over `durationMs`. History-
 * ignored, so it never touches the document. Returns its id; pass it to
 * {@link removeMorphPreview}.
 */
export function showMorphLinePreview(
	editor: Editor,
	start: VecLike,
	end: VecLike,
	color: TLDefaultColorStyle,
	durationMs: number
): TLShapeId {
	const ghostId = createShapeId()
	const [startKey, endKey] = getIndices(2)
	editor.run(
		() => {
			editor.createShape<TLLineShape>({
				id: ghostId,
				type: 'line',
				isLocked: true,
				x: start.x,
				y: start.y,
				opacity: 0,
				props: {
					color,
					spline: 'line',
					points: {
						[startKey]: { id: startKey, index: startKey, x: 0, y: 0 },
						[endKey]: { id: endKey, index: endKey, x: end.x - start.x, y: end.y - start.y },
					},
				},
				meta: { magicWandGhost: true },
			})
		},
		{ history: 'ignore' }
	)
	animateShapeOpacity(editor, ghostId, 0, MORPH_PREVIEW_OPACITY, durationMs)
	return ghostId
}

/** Removes the hold preview shape created by {@link showMorphPreview}. */
export function removeMorphPreview(editor: Editor, ghostId: TLShapeId | null) {
	if (!ghostId) return
	editor.run(() => editor.deleteShape(ghostId), { history: 'ignore', ignoreShapeLock: true })
}

/**
 * Fades a freshly created shape in from transparent to solid using
 * history-ignored opacity updates (the shape's recorded opacity stays 1, so
 * undo/redo are unaffected). Used for the morph target rectangle.
 */
export function fadeInShape(
	editor: Editor,
	shapeId: TLShapeId,
	durationMs = MORPH_FADE_DURATION_MS
) {
	const shape = editor.getShape(shapeId)
	if (!shape) return
	editor.run(() => editor.updateShape({ id: shapeId, type: shape.type, opacity: 0 }), {
		history: 'ignore',
	})
	animateShapeOpacity(editor, shapeId, 0, 1, durationMs)
}
