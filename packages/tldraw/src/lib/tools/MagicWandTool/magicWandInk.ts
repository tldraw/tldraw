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
		editor.run(() => editor.updateShape({ id: shapeId, type: shape.type, opacity }), {
			history: 'ignore',
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
 * Fades a just-drawn magic wand stroke from its translucent in-progress opacity
 * up to fully solid — a quick "ink drying" effect.
 */
export function dryMagicWandInk(editor: Editor, shapeId: TLShapeId) {
	animateShapeOpacity(editor, shapeId, MAGIC_WAND_INK_OPACITY, 1, INK_DRY_DURATION_MS)
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
			editor.run(() => editor.deleteShape(ghostId), { history: 'ignore' })
		})
	})
}
