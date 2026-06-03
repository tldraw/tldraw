import { useSyncDemo } from '@tldraw/sync'
import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Tables sync like any other shape. Open this example in two browser tabs and
// edit at once: typing in *different* cells never conflicts, because each cell is
// its own record. Editing the same cell, or a structural change, resolves
// last-writer-wins, consistent with the rest of the canvas.
//
// Add a table with the toolbar tool, then double-click a cell to edit.

const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.table = {
			id: 'table',
			icon: 'tool-frame',
			label: 'Table',
			kbd: 'shift+t',
			onSelect: () => editor.setCurrentTool('table'),
		}
		return tools
	},
}

const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSelected = useIsToolSelected(tools['table'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['table']} isSelected={isSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<DefaultKeyboardShortcutsDialogContent />
				<TldrawUiMenuItem {...tools['table']} />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

export default function TableMultiplayerExample({ roomId }: { roomId: string }) {
	const store = useSyncDemo({ roomId })
	return (
		<div className="tldraw__editor">
			<Tldraw store={store} overrides={uiOverrides} components={components} />
		</div>
	)
}
