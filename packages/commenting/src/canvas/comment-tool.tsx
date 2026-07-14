import { StateNode, TLCommentAnchor, TLStateNodeConstructor, TLUiOverrides, VecLike } from 'tldraw'
import { type CommentingOptions, defaultCommentingOptions } from './options'
import { pendingComment } from './state'
import { shapeAnchorAt } from './thread-state'

/** A comment being placed but not yet posted: where its composer sits and what it will anchor
 *  to. Shared between the tool (which sets it on click) and the overlay (which renders the
 *  composer). Null when nothing is being placed. The atom itself lives in `./state`
 *  ({@link pendingComment}), scoped per editor. */
export interface PendingComment {
	anchor: TLCommentAnchor
	/** Page point where the composer opens (the click location). */
	point: VecLike
}

/**
 * The comment tool. Clicking the canvas starts a thread: on a shape it anchors to that shape (so
 * the pin tracks it), on empty canvas it drops a point anchor. Placement only opens a composer
 * (via `pendingComment`); the records are created when the comment is posted.
 */
export class CommentTool extends StateNode {
	static override id = 'comment'

	/**
	 * Configure this tool's {@link CommentTool.options | `options`}, returning a configured subclass
	 * to register via `tools`. Mirrors `ShapeUtil.configure`. Layers over any prior `configure`, so
	 * calls can be chained.
	 *
	 * @example
	 * ```tsx
	 * <Tldraw tools={[CommentTool.configure({ history: 'ignore', enableClustering: false })]} />
	 * ```
	 */
	static configure<T extends TLStateNodeConstructor>(
		this: T,
		options: T extends new (...args: any[]) => { options: infer Options } ? Partial<Options> : never
	): T {
		// @ts-expect-error -- mirrors ShapeUtil.configure; extending `this` is sound at runtime.
		return class extends this {
			// @ts-expect-error
			options = { ...this.options, ...options }
		}
	}

	/**
	 * The merged commenting options for this editor. Read from anywhere via
	 * {@link getCommentingOptions}. Override with {@link CommentTool.configure}.
	 */
	options: CommentingOptions = defaultCommentingOptions

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	// Escape leaves the tool, like the built-in tools (the editor dispatches `cancel` on Escape).
	override onCancel() {
		this.editor.setCurrentTool('select')
	}

	override onPointerDown() {
		const { editor } = this
		const point = editor.inputs.getCurrentPagePoint()
		const hit = editor.getShapeAtPoint(point, { hitInside: true })
		const anchor: TLCommentAnchor = hit
			? shapeAnchorAt(editor, hit.id, point, editor.inputs.getAltKey())
			: { type: 'point', x: point.x, y: point.y }
		pendingComment.set(editor, { anchor, point: { x: point.x, y: point.y } })
		// Hand back to select; the open composer is now the focus.
		editor.setCurrentTool('select')
	}
}

export const commentTools = [CommentTool]

/** Registers the comment tool in the UI (icon, label, shortcut). Compose into your overrides.
 *  Once registered, tldraw's `DefaultToolbarContent` shows the comment button next to the eraser. */
export const commentToolOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.comment = {
			id: 'comment',
			icon: 'comment',
			label: 'Comment',
			kbd: 'c',
			onSelect: () => editor.setCurrentTool('comment'),
		}
		return tools
	},
}
