import { atom, BoxModel, StateNode, TLCommentAnchor, TLUiOverrides, VecLike } from 'tldraw'
import { shapeAnchorAt } from './thread-state'

/** A comment being placed but not yet posted: where its composer sits and what it will anchor
 *  to. Shared between the tool (which sets it on click) and the overlay (which renders the
 *  composer). Null when nothing is being placed. */
export interface PendingComment {
	anchor: TLCommentAnchor
	/** Page point where the composer opens (the click location, or a region's bottom-left). */
	point: VecLike
}

/** The comment currently being placed, or null. Exposed so a consumer can drive placement
 *  itself (e.g. from a different gesture) instead of, or alongside, the comment tool. */
export const pendingComment = atom<PendingComment | null>('pendingComment', null)

/** The region rectangle being dragged out right now (page coords), or null when not dragging.
 *  The tool writes it on each move; the overlay reads it to draw the live dashed box. */
export const regionDraft = atom<BoxModel | null>('regionDraft', null)

/** The page-space rectangle spanned by two points, normalized so w/h are non-negative. */
function regionBetween(a: VecLike, b: VecLike): BoxModel {
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
 */
export class CommentTool extends StateNode {
	static override id = 'comment'
	static override initial = 'idle'
	static override children() {
		return [CommentIdle, CommentPointing, CommentDragging]
	}

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

	// Once the pointer passes the editor's drag threshold this is a region, not a click.
	override onPointerMove() {
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('dragging')
		}
	}

	// A pointer up with no drag is a click: anchor to the shape under it, or drop a point.
	override onPointerUp() {
		const { editor } = this
		const point = editor.inputs.getCurrentPagePoint()
		const hit = editor.getShapeAtPoint(point, { hitInside: true })
		const anchor: TLCommentAnchor = hit
			? shapeAnchorAt(editor, hit.id, point, editor.inputs.getAltKey())
			: { type: 'point', x: point.x, y: point.y }
		pendingComment.set({ anchor, point: { x: point.x, y: point.y } })
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

	// Commit the dragged rectangle as a region anchor; the composer opens at its bottom-left.
	override onPointerUp() {
		const { editor } = this
		const region = regionBetween(
			editor.inputs.getOriginPagePoint(),
			editor.inputs.getCurrentPagePoint()
		)
		regionDraft.set(null)
		pendingComment.set({
			anchor: { type: 'region', ...region },
			point: { x: region.x, y: region.y + region.h },
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
			regionBetween(editor.inputs.getOriginPagePoint(), editor.inputs.getCurrentPagePoint())
		)
	}

	private cancel() {
		regionDraft.set(null)
		this.editor.setCurrentTool('select')
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
