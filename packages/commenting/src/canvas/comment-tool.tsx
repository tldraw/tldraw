import {
	BoxModel,
	StateNode,
	TLCommentAnchor,
	TLStateNodeConstructor,
	TLUiOverrides,
	VecLike,
} from 'tldraw'
import { type CommentingOptions, defaultCommentingOptions } from './options'
import { getRegionCommentOptions } from './region-options'
import { pendingComment, regionDraft } from './state'
import { regionPinPoint, shapeAnchorAt } from './thread-state'

/** A comment being placed but not yet posted: where its composer sits and what it will anchor
 *  to. Shared between the tool (which sets it on click) and the overlay (which renders the
 *  composer). Null when nothing is being placed. The atom itself lives in `./state`
 *  ({@link pendingComment}), scoped per editor.
 * @public */
export interface PendingComment {
	anchor: TLCommentAnchor
	/** Page point where the composer opens (the click location, or a region's pin corner). */
	point: VecLike
}

/**
 * Merge configure options over a base. Shallow for scalars; `components` is merged rather than
 * replaced so chained `configure` calls layer their slots — a later `{ components: { PinContent } }`
 * doesn't drop an earlier `{ components: { CommentBody } }`.
 */
function mergeCommentingOptions(
	base: CommentingOptions,
	overrides: Partial<CommentingOptions>
): CommentingOptions {
	return {
		...base,
		...overrides,
		components: { ...base.components, ...overrides.components },
	}
}

/** The page-space rectangle spanned by two points, normalized so w/h are non-negative. Shared by
 *  region creation (pointer-down → cursor) and corner resize (fixed corner → cursor). */
export function regionBetween(a: VecLike, b: VecLike): BoxModel {
	return {
		x: Math.min(a.x, b.x),
		y: Math.min(a.y, b.y),
		w: Math.abs(a.x - b.x),
		h: Math.abs(a.y - b.y),
	}
}

/**
 * The comment tool. A click starts a point/shape thread (the pin tracks the shape it lands on);
 * dragging out a rectangle starts a region thread anchored to that area. Placement only opens a
 * composer (via `pendingComment`); the records are created when the comment is posted.
 * @public
 */
export class CommentTool extends StateNode {
	static override id = 'comment'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [CommentIdle, CommentPointing, CommentDragging]
	}

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
			options = mergeCommentingOptions(this.options, options)
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
}

class CommentIdle extends StateNode {
	static override id = 'idle'

	override onPointerDown() {
		this.parent.transition('pointing')
	}
}

class CommentPointing extends StateNode {
	static override id = 'pointing'

	// Once the pointer passes the editor's drag threshold this is a region, not a click — but only
	// when region comments are enabled; otherwise a drag is treated as a click (point/shape).
	override onPointerMove() {
		if (getRegionCommentOptions(this.editor).enabled && this.editor.inputs.getIsDragging()) {
			this.parent.transition('dragging')
		}
	}

	// A pointer up with no drag is a click: anchor to the shape under it, or drop a point.
	// Clicking a shape that's part of a multi-shape selection anchors to the whole selection.
	override onPointerUp() {
		const { editor } = this
		const point = editor.inputs.getCurrentPagePoint()
		const hit = editor.getShapeAtPoint(point, { hitInside: true })
		let anchor: TLCommentAnchor
		if (hit) {
			const selectedIds = editor.getSelectedShapeIds()
			// The hit is never a group, so match the selection through the clicked shape's
			// outermost selectable ancestor. The clicked shape goes first: `shapeIds[0]` is the
			// anchor's primary shape (used for denormalized queries and deep links).
			const clicked = editor.getOutermostSelectableShape(hit)
			const ids =
				selectedIds.length > 1 && selectedIds.includes(clicked.id)
					? [clicked.id, ...selectedIds.filter((id) => id !== clicked.id)]
					: [hit.id]
			anchor = shapeAnchorAt(editor, ids, point, editor.inputs.getAltKey())
		} else {
			anchor = { type: 'point', x: point.x, y: point.y }
		}
		pendingComment.set(editor, { anchor, point: { x: point.x, y: point.y } })
		// Hand back to select; the open composer is now the focus.
		editor.setCurrentTool('select')
	}
}

class CommentDragging extends StateNode {
	static override id = 'dragging'

	override onEnter() {
		this.updateDraft()
	}

	override onPointerMove() {
		this.updateDraft()
	}

	// Commit the dragged rectangle as a region anchor; the composer opens at its pin corner.
	override onPointerUp() {
		const { editor } = this
		const region = regionBetween(
			editor.inputs.getOriginPagePoint(),
			editor.inputs.getCurrentPagePoint()
		)
		regionDraft.set(editor, null)
		pendingComment.set(editor, {
			anchor: { type: 'region', ...region },
			point: regionPinPoint(region, getRegionCommentOptions(editor).pinCorner),
		})
		editor.setCurrentTool('select')
	}

	override onCancel() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private updateDraft() {
		const { editor } = this
		regionDraft.set(
			editor,
			regionBetween(editor.inputs.getOriginPagePoint(), editor.inputs.getCurrentPagePoint())
		)
	}

	private cancel() {
		regionDraft.set(this.editor, null)
		this.editor.setCurrentTool('select')
	}
}

/** @public */
export const commentTools = [CommentTool]

/** Registers the comment tool in the UI (icon, label, shortcut). Compose into your overrides.
 *  Once registered, tldraw's `DefaultToolbarContent` shows the comment button next to the eraser.
 * @public */
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
