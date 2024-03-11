import { createContext, useContext, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const focusedEditorContext = createContext(
	{} as {
		focusedEditor: Editor | null
		setFocusedEditor: (id: Editor | null) => void
	}
)

export default function InlineBehaviorExample() {
	const [focusedEditor, setFocusedEditor] = useState<Editor | null>(null)

	return (
		<focusedEditorContext.Provider value={{ focusedEditor, setFocusedEditor }}>
			<div
				style={{
					margin: 20,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
				onPointerDown={() => {
					if (!focusedEditor) return
					focusedEditor.selectNone()
					focusedEditor.updateInstanceState({ isFocused: false })
					focusedEditor.setCurrentTool('hand')
					setFocusedEditor(null)
				}}
			>
				<WhiteboardBlock persistenceKey="block-a" />
				<WhiteboardBlock persistenceKey="block-b" />
				<WhiteboardBlock persistenceKey="block-c" />
			</div>
		</focusedEditorContext.Provider>
	)
}

function WhiteboardBlock({ persistenceKey }: { persistenceKey: string }) {
	const { focusedEditor, setFocusedEditor } = useContext(focusedEditorContext)

	const [editor, setEditor] = useState<Editor>()

	return (
		<div
			style={{ width: 600, maxWidth: '100%', height: 400, marginTop: 15 }}
			onFocus={() => {
				if (!editor) return
				if (focusedEditor && focusedEditor !== editor) {
					focusedEditor.selectNone()
					focusedEditor.updateInstanceState({ isFocused: false })
					focusedEditor.setCurrentTool('hand')
				}
				editor.updateInstanceState({ isFocused: true })
				setFocusedEditor(editor)
			}}
		>
			<Tldraw
				persistenceKey={persistenceKey}
				hideUi={focusedEditor !== editor}
				autoFocus={false}
				components={{
					HelpMenu: null,
					NavigationPanel: null,
					MainMenu: null,
					PageMenu: null,
				}}
				onMount={(editor) => {
					setEditor(editor)
					editor.updateInstanceState({ isDebugMode: false })
					editor.setCurrentTool('hand')
				}}
			/>
		</div>
	)
}
