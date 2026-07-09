import {
	atom,
	DefaultToolbar,
	DefaultToolbarContent,
	StateNode,
	TldrawUiMenuItem,
	TLCommentAnchor,
	TLComponents,
	TLUiOverrides,
	useIsToolSelected,
	useTools,
	VecLike,
} from 'tldraw'
import { useCommentingEnabled } from './license'
import { shapeAnchorAt } from './thread-state'

/** A comment being placed but not yet posted: where its composer sits and what it will anchor
 *  to. Shared between the tool (which sets it on click) and the overlay (which renders the
 *  composer). Null when nothing is being placed. */
export interface PendingComment {
	anchor: TLCommentAnchor
	/** Page point where the composer opens (the click location). */
	point: VecLike
}

/** The comment currently being placed, or null. Exposed so a consumer can drive placement
 *  itself (e.g. from a different gesture) instead of, or alongside, the comment tool. */
export const pendingComment = atom<PendingComment | null>('pendingComment', null)

/**
 * The comment tool. Clicking the canvas starts a thread: on a shape it anchors to that shape (so
 * the pin tracks it), on empty canvas it drops a point anchor. Placement only opens a composer
 * (via `pendingComment`); the records are created when the comment is posted.
 */
export class CommentTool extends StateNode {
	static override id = 'comment'

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
		pendingComment.set({ anchor, point: { x: point.x, y: point.y } })
		// Hand back to select; the open composer is now the focus.
		editor.setCurrentTool('select')
	}
}

export const commentTools = [CommentTool]

/** Registers the comment tool in the UI (icon, label, shortcut). Compose into your overrides. */
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

/** A Toolbar with the comment tool added after the default tools. Use as-is, or build your
 *  own toolbar with `tools.comment`. The comment button is hidden when commenting isn't licensed. */
export const commentToolComponents: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSelected = useIsToolSelected(tools.comment)
		const commentingEnabled = useCommentingEnabled()
		return (
			<DefaultToolbar {...props}>
				<DefaultToolbarContent />
				{commentingEnabled && <TldrawUiMenuItem {...tools.comment} isSelected={isSelected} />}
			</DefaultToolbar>
		)
	},
}
