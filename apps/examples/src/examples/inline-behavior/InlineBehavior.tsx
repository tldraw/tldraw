import { createContext, useContext, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this page!

// [1]
const focusedEditorContext = createContext(
	{} as {
		focusedEditor: Editor | null
		setFocusedEditor(id: Editor | null): void
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
This example demonstrates some common best practices for using tldraw as an inline block within a
larger document editor.

It includes:

- Making sure that only one editor has focus at a time.
- Always defaulting to the hand tool when you click into an editor.
- Deselecting everything when an editor loses focus.
- Hiding the UI when an editor is not focused.
- Disabling edge scrolling by default.
- Using a stripped down UI to make the most of the available space.

[1]
We use a context to manage which editor is currently focused. This allows us to have multiple
editors on the same page, without them interfering with each other, or hijacking any keyboard
shortcuts. For more information about handling focus, check out the 'Multiple editors' and 'Editor
focus' examples.

[2]
We have a helper function that we call on any editor that loses focus. We deselect everything, and
switch back to the hand tool, essentially 'resetting' the user's tool state.

[3]
When the user clicks anywhere on the page outside of an editor, we blur the currently focused
editor.

[4]
When the user clicks into an editor, we focus it, and blur any other editor.
We also prevent pointer down events from passing through to the parent.

[5]
We hide the UI of any unfocused editor.

[6]
We disable pages to hide the pages menu. We disable edge scrolling, which can sometimes be too
easily triggered when the editor is in a small space. 

[7]
We disable many of tldraw's default UI components to make the most of the available space.

[8]
When an editor mounts, we default to the hand tool. We also store a reference to the editor so that
we can access it later.

*/
