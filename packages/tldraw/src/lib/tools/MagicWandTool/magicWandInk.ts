import {
	EASINGS,
	Editor,
	TLDefaultColorStyle,
	TLDrawShape,
	TLGeoShape,
	TLShapeId,
	createShapeId,
} from '@tldraw/editor'

/** The opacity of magic wand ink while a stroke is in progress. */
export const MAGIC_WAND_INK_OPACITY = 0.5

/**
 * The colour the ink turns while a stroke would resolve to a lasso selection.
 * Draw shapes can only use palette colours, so this is the closest match to the
 * selection highlight rather than the exact selection colour.
 */
export const MAGIC_WAND_LASSO_COLOR: TLDefaultColorStyle = 'blue'

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

/** How long the sketch→shape crossfade takes when a morph fires, in ms. */
const MORPH_FADE_DURATION_MS = 250

/** Class on the <style> element that holds the magic wand's per-stroke opacity rule. */
export const INK_STYLE_ELEMENT_CLASS = 'tl-magic-wand-ink-style'

// One style element per editor (keyed by instance, not a shared DOM id, so
// multiple editors on a page don't collide).
const inkStyleElements = new WeakMap<Editor, HTMLStyleElement>()

function getInkStyleElement(editor: Editor): HTMLStyleElement {
	let el = inkStyleElements.get(editor)
	if (!el || !el.isConnected) {
		const container = editor.getContainer()
		el = container.ownerDocument.createElement('style')
		el.className = INK_STYLE_ELEMENT_CLASS
		container.appendChild(el)
		inkStyleElements.set(editor, el)
	}
	return el
}

// A selector matching every given shape (the draw tool can split one long
// stroke into several shapes, so the wet ink may cover more than one).
function inkSelector(shapeIds: TLShapeId[]): string {
	return shapeIds.map((id) => `.tl-shape[data-shape-id="${id}"]`).join(',')
}

/**
 * Shows the in-progress stroke at half opacity using CSS only, so the shape's
 * real `opacity` is left untouched (the translucency is purely a visual effect
 * and never leaks into undo/redo, cancel, etc). `!important` is needed to beat
 * the shape's inline opacity. No transition here, so the stroke appears
 * translucent immediately rather than fading in.
 */
export function setWetInk(editor: Editor, shapeIds: TLShapeId[]) {
	if (shapeIds.length === 0) {
		clearWetInk(editor)
		return
	}
	getInkStyleElement(editor).textContent =
		`${inkSelector(shapeIds)}{opacity:${MAGIC_WAND_INK_OPACITY}!important}`
}

/**
 * Drops the translucency so the stroke eases back to its real opacity — a quick
 * "ink drying" effect, done entirely in CSS. Clears the rule once the transition
 * finishes (unless a newer stroke has since taken over the style element).
 */
export function dryWetInk(editor: Editor, shapeIds: TLShapeId[]) {
	if (shapeIds.length === 0) return
	getInkStyleElement(editor).textContent =
		`${inkSelector(shapeIds)}{transition:opacity ${INK_DRY_DURATION_MS}ms ease}`
	editor.timers.setTimeout(() => clearWetInk(editor, shapeIds[0]), INK_DRY_DURATION_MS)
}

/**
 * Removes the wet-ink styling immediately. Pass `onlyForShapeId` to clear only if
 * the rule still targets that shape, so a pending dry-clear doesn't wipe a newer
 * stroke's styling.
 */
export function clearWetInk(editor: Editor, onlyForShapeId?: TLShapeId) {
	const el = inkStyleElements.get(editor)
	if (!el) return
	if (onlyForShapeId && !el.textContent?.includes(onlyForShapeId)) return
	el.textContent = ''
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

/** The geo rectangle params the hold preview / morph need (page space). */
export interface MorphRectangle {
	x: number
	y: number
	w: number
	h: number
	rotation: number
	color: TLDefaultColorStyle
}

/**
 * Shows the hold "charging" preview: a locked, ephemeral, outline-only rectangle
 * at the recognized location whose opacity ramps up over `durationMs` so the user
 * sees a morph is imminent. History-ignored, so it never touches the document.
 * Returns its id; pass it to {@link removeMorphPreview}.
 */
export function showMorphPreview(
	editor: Editor,
	rect: MorphRectangle,
	durationMs: number
): TLShapeId {
	const ghostId = createShapeId()
	editor.run(
		() => {
			editor.createShape<TLGeoShape>({
				id: ghostId,
				type: 'geo',
				isLocked: true,
				x: rect.x,
				y: rect.y,
				rotation: rect.rotation,
				opacity: 0,
				props: { geo: 'rectangle', w: rect.w, h: rect.h, color: rect.color, fill: 'none' },
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
