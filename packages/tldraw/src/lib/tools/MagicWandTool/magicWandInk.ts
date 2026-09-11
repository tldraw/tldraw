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
 * Meta key marking a shape as a throwaway magic wand visual (ghosts, delete
 * overlays, morph previews). These are deleted and recreated freely at runtime;
 * if one survives an abnormal end of a session (crash, tab close, disconnect),
 * {@link sweepMagicWandTransients} deletes it on the next load.
 */
export const MAGIC_WAND_GHOST_META_KEY = 'magicWandGhost'

/**
 * Meta key carrying a real shape's natural values while the magic wand has
 * temporarily overridden them (wet-ink opacity, preview tint/fill, forced
 * `isClosed`, morph fade-in). The tag is the single source of truth for
 * restoring the shape: the live restore paths apply it when the override ends,
 * and because it rides the (synced, persisted) record, a session that ends
 * abnormally leaves enough behind for {@link sweepMagicWandTransients} to heal
 * the shape on the next load instead of freezing the transient look into the
 * document.
 */
export const MAGIC_WAND_RESTORE_META_KEY = 'magicWandRestore'

/** The natural values a tagged shape should be restored to. */
export interface MagicWandRestoreState {
	opacity: number
	color?: TLDefaultColorStyle
	fill?: string
	isClosed?: boolean
}

/** Reads a shape's restore tag, or null if absent/malformed. */
function getRestoreState(shape: TLShape): MagicWandRestoreState | null {
	const raw = shape.meta[MAGIC_WAND_RESTORE_META_KEY]
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
	if (typeof (raw as Record<string, unknown>).opacity !== 'number') return null
	return raw as unknown as MagicWandRestoreState
}

/** The update that puts a tagged shape back to its natural state and untags it. */
function buildRestorePartial(shape: TLShape, restore: MagicWandRestoreState): TLShapePartial {
	const partial = {
		id: shape.id,
		type: shape.type,
		opacity: restore.opacity,
		// Meta merges per key, so clearing needs an explicit null (not undefined,
		// which both the merge and JSON validation would drop).
		meta: { [MAGIC_WAND_RESTORE_META_KEY]: null },
	} as TLShapePartial
	// Prop overrides are only ever tagged onto draw strokes; applied untyped.
	const props: Record<string, unknown> = {}
	if (restore.color !== undefined) props.color = restore.color
	if (restore.fill !== undefined) props.fill = restore.fill
	if (restore.isClosed !== undefined) props.isClosed = restore.isClosed
	if (Object.keys(props).length > 0) (partial as { props?: object }).props = props
	return partial
}

/**
 * Shows the in-progress stroke at half opacity by lowering the shape's real
 * `opacity`. The write is history-ignored, so undo/redo never replay it, but it
 * does reach the store — which is the point: collaborators receive the record,
 * so they see the translucent "wet ink" too (a CSS-only effect would render as
 * a solid stroke on other clients). Each piece is tagged with its natural
 * opacity so {@link clearWetInk} and the load-time sweep can restore it; pieces
 * already tagged are left alone (their tag may carry preview tint state too).
 * No fade-in here, so the stroke appears translucent immediately.
 */
export function setWetInk(editor: Editor, shapeIds: TLShapeId[], naturalOpacity: number) {
	if (shapeIds.length === 0) return
	editor.run(
		() => {
			for (const id of shapeIds) {
				const shape = editor.getShape(id)
				if (!shape || getRestoreState(shape)) continue
				editor.updateShape({
					id,
					type: shape.type,
					opacity: MAGIC_WAND_INK_OPACITY,
					meta: { [MAGIC_WAND_RESTORE_META_KEY]: { opacity: naturalOpacity } },
				})
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
 * Called while the gesture's undo entry is still open. The natural opacity and
 * cleared tag are first committed with a recorded write: the draw tool's own
 * recorded updates squash the whole record (including the ignored wet values)
 * into the entry, so without this a redo would resurrect the stroke translucent
 * and tagged. The record is then dipped back down (ignored) in the same tick —
 * no visible pop — and the tween carries it home.
 */
export function dryWetInk(editor: Editor, shapeIds: TLShapeId[]) {
	if (shapeIds.length === 0) return
	const naturalOpacities = new Map<TLShapeId, number>()
	editor.run(() => {
		for (const id of shapeIds) {
			const shape = editor.getShape(id)
			if (!shape) continue
			const naturalOpacity = getRestoreState(shape)?.opacity ?? 1
			naturalOpacities.set(id, naturalOpacity)
			editor.updateShape({
				id,
				type: shape.type,
				opacity: naturalOpacity,
				meta: { [MAGIC_WAND_RESTORE_META_KEY]: null },
			})
		}
	})
	editor.run(
		() => {
			for (const id of naturalOpacities.keys()) {
				const shape = editor.getShape(id)
				if (!shape) continue
				editor.updateShape({ id, type: shape.type, opacity: MAGIC_WAND_INK_OPACITY })
			}
		},
		{ history: 'ignore' }
	)
	for (const [id, naturalOpacity] of naturalOpacities) {
		animateShapeOpacity(editor, id, MAGIC_WAND_INK_OPACITY, naturalOpacity, INK_DRY_DURATION_MS)
	}
}

/**
 * Restores each stroke piece to the natural state carried by its restore tag —
 * opacity, and any preview tint/fill/isClosed overrides — immediately (e.g. on
 * cancel, or a tool switch mid-gesture). Skips shapes that no longer exist;
 * gesture strokes are usually bailed away before this runs.
 */
export function clearWetInk(editor: Editor, shapeIds: TLShapeId[]) {
	editor.run(
		() => {
			for (const id of shapeIds) {
				const shape = editor.getShape(id)
				if (!shape) continue
				const restore = getRestoreState(shape)
				if (!restore) continue
				editor.updateShape(buildRestorePartial(shape, restore))
			}
		},
		{ history: 'ignore' }
	)
}

/**
 * Heals magic wand transients that an abnormally ended session (crash, tab
 * close, disconnect) froze into the document: deletes surviving ghost shapes
 * (fade-outs, delete overlays, morph previews — all locked visual effects) and
 * restores any shape still carrying a restore tag to its natural state. Runs
 * once per editor on mount; history-ignored, so it can't be undone into
 * existence again.
 */
export function sweepMagicWandTransients(editor: Editor) {
	const ghostIds: TLShapeId[] = []
	const restores: TLShapePartial[] = []
	for (const record of editor.store.allRecords()) {
		if (record.typeName !== 'shape') continue
		const shape = record as TLShape
		if (shape.meta[MAGIC_WAND_GHOST_META_KEY]) {
			ghostIds.push(shape.id)
			continue
		}
		const restore = getRestoreState(shape)
		if (restore) restores.push(buildRestorePartial(shape, restore))
	}
	if (ghostIds.length === 0 && restores.length === 0) return
	editor.run(
		() => {
			if (ghostIds.length) editor.deleteShapes(ghostIds)
			if (restores.length) editor.updateShapes(restores)
		},
		{ history: 'ignore', ignoreShapeLock: true }
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
					meta: { [MAGIC_WAND_GHOST_META_KEY]: true },
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
				meta: { [MAGIC_WAND_GHOST_META_KEY]: true },
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
				meta: { [MAGIC_WAND_GHOST_META_KEY]: true },
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
				meta: { [MAGIC_WAND_GHOST_META_KEY]: true },
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
 * history-ignored opacity updates (the shape's recorded opacity stays at its
 * natural value, so undo/redo are unaffected). Used for the morph target.
 * While the fade runs, the shape carries a restore tag so a session that dies
 * mid-fade doesn't freeze the shape semi-transparent — the next load's
 * {@link sweepMagicWandTransients} finishes the job.
 */
export function fadeInShape(
	editor: Editor,
	shapeId: TLShapeId,
	durationMs = MORPH_FADE_DURATION_MS
) {
	const shape = editor.getShape(shapeId)
	if (!shape) return
	const naturalOpacity = shape.opacity
	editor.run(
		() =>
			editor.updateShape({
				id: shapeId,
				type: shape.type,
				opacity: 0,
				meta: { [MAGIC_WAND_RESTORE_META_KEY]: { opacity: naturalOpacity } },
			}),
		{ history: 'ignore' }
	)
	animateShapeOpacity(editor, shapeId, 0, naturalOpacity, durationMs, () => {
		const current = editor.getShape(shapeId)
		if (!current) return
		editor.run(
			() =>
				editor.updateShape({
					id: shapeId,
					type: current.type,
					meta: { [MAGIC_WAND_RESTORE_META_KEY]: null },
				}),
			{ history: 'ignore' }
		)
	})
}
