import {
	EASINGS,
	Editor,
	TLDefaultColorStyle,
	TLDrawShape,
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
 * Plays the lasso-resolved ink effect: a throwaway copy of the stroke (already
 * the selection colour from the live gesture) fades out and is then removed. The
 * copy is created and destroyed with history ignored, so it's purely visual and
 * never undoable. We defer creation by a frame so the committed post-selection
 * state stays clean.
 */
export function fadeOutLassoInk(editor: Editor, inkSnapshot: TLDrawShape) {
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
					props: { ...inkSnapshot.props, color: MAGIC_WAND_LASSO_COLOR, isComplete: true },
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
