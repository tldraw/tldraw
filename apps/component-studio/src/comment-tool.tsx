import {
	DefaultToolbar,
	DefaultToolbarContent,
	StateNode,
	TLComponents,
	TLUiOverrides,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'

/** A comment tool for the toolbar. No-op behaviour — it's the affordance we're showing. */
export class CommentTool extends StateNode {
	static override id = 'comment'
}

export const commentTools = [CommentTool]

// Register the comment tool in the UI (icon, label, shortcut).
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

// Add the comment tool to the toolbar, before the default tools.
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
