import {
	DefaultToolbar,
	DefaultToolbarContent,
	StateNode,
	TLComponents,
	TLCommentAnchor,
	TLUiOverrides,
	TldrawUiMenuItem,
	VecLike,
	atom,
	useIsToolSelected,
	useTools,
} from 'tldraw'

/** A comment the user is placing but hasn't posted yet: where its composer sits and what it
 *  will anchor to. Shared between the tool (which sets it on click) and CommentsOnCanvas
 *  (which renders the composer). Null when nothing is being placed. */
export interface PendingComment {
	anchor: TLCommentAnchor
	/** Page point where the composer opens (the click location). */
	point: VecLike
}

export const pendingComment = atom<PendingComment | null>('pendingComment', null)

/**
 * The comment tool. Activating it lets you click anywhere on the canvas to start a thread: a
 * click on a shape anchors the thread to that shape (so the pin tracks it), a click on empty
 * canvas drops a point-anchored pin. Placement just opens a composer (via `pendingComment`);
 * the records are created when the comment is posted, in CommentsOnCanvas.
 */
export class CommentTool extends StateNode {
	static override id = 'comment'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const { editor } = this
		const point = editor.inputs.getCurrentPagePoint()
		const hit = editor.getShapeAtPoint(point, { hitInside: true })
		const anchor: TLCommentAnchor = hit
			? { type: 'shape', shapeId: hit.id }
			: { type: 'point', x: point.x, y: point.y }
		pendingComment.set({ anchor, point: { x: point.x, y: point.y } })
		// Hand back to select; the open composer is now the focus.
		editor.setCurrentTool('select')
	}
}

export const commentTools = [CommentTool]

/** Register the comment tool in the UI (icon, label, shortcut). */
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

/** Toolbar with the comment tool added ahead of the default tools. */
export const commentToolComponents: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSelected = useIsToolSelected(tools.comment)
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools.comment} isSelected={isSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}
