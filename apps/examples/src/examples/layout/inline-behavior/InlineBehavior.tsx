import { createContext, useContext, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this page!

// [1]
const focusedEditorContext = createContext(
	{} as {
		focusedEditor: Editor | null
		setFocusedEditor(editor: Editor | null): void
	}
)

// [2]
function blurEditor(editor: Editor) {
	editor.blur({ blurContainer: false })
	editor.selectNone()
	editor.setCurrentTool('hand')
}

export default function InlineBehaviorExample() {
	const [focusedEditor, setFocusedEditor] = useState<Editor | null>(null)

	return (
		<focusedEditorContext.Provider value={{ focusedEditor, setFocusedEditor }}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					padding: 20,
					gap: 20,
				}}
				// [3]
				onPointerDown={() => {
					if (!focusedEditor) return
					blurEditor(focusedEditor)
					setFocusedEditor(null)
				}}
			>
				<InlineBlock persistenceKey="block-a" />
				<InlineBlock persistenceKey="block-b" />
				<InlineBlock persistenceKey="block-c" />
			</div>
		</focusedEditorContext.Provider>
	)
}

function InlineBlock({ persistenceKey }: { persistenceKey: string }) {
	const { focusedEditor, setFocusedEditor } = useContext(focusedEditorContext)
	const [editor, setEditor] = useState<Editor>()

	return (
		<div
			style={{ width: 600, height: 400, maxWidth: '100%' }}
			// [4]
			onFocus={() => {
				if (!editor) return
				if (focusedEditor && focusedEditor !== editor) {
					blurEditor(focusedEditor)
				}
				editor.focus({ focusContainer: false })
				setFocusedEditor(editor)
			}}
			onPointerDown={(e) => e.stopPropagation()}
		>
			<Tldraw
				persistenceKey={persistenceKey}
				autoFocus={false}
				// [5]
				hideUi={focusedEditor !== editor}
				// [6]
				options={{
					maxPages: 0,
					edgeScrollSpeed: 0,
				}}
				// [7]
				components={{
					HelpMenu: null,
					NavigationPanel: null,
					MainMenu: null,
				}}
				// [8]
				onMount={(editor) => {
					setEditor(editor)
					editor.setCurrentTool('hand')
				}}
			/>
		</div>
	)
}

/*
[1]
A context tracking which editor is focused. Only the focused editor handles keyboard
shortcuts, so several editors on one page don't fight over them. See also the
'Multiple editors' and 'Focus the editor' examples.

[2]
Called on any editor that loses focus. `blurContainer: false` stops the editor's
DOM container from being blurred (we manage focus at the block level), and we reset
the user's tool state so nothing is left selected or half-drawn.

[3]
Clicking anywhere on the page outside an editor blurs the focused one.

[4]
Clicking into a block focuses its editor and blurs whichever was focused before.
Stopping pointer-down propagation keeps [3] from immediately blurring it again.

[5]
Unfocused editors hide their UI.

[6]
`maxPages: 0` removes the pages menu. `edgeScrollSpeed: 0` disables edge scrolling,
which is too easily triggered when the canvas is small.

[7]
Drop UI components that don't earn their space in a small block.

[8]
Default to the hand tool on mount so scrolling past a block doesn't accidentally
move shapes, and keep a reference to the editor for the focus handlers.
*/
