import { createContext, useContext, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const FocusedEditorContext = createContext(
	{} as {
		focusedEditor: string | null
		setFocusedEditor: (id: string | null) => void
	}
)

export default function InlineExample() {
	const [focusedEditor, setFocusedEditor] = useState<string | null>(null)
	return (
		<FocusedEditorContext.Provider value={{ focusedEditor, setFocusedEditor }}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					padding: 32,
					paddingTop: 12,
					gap: 12,
				}}
			>
				<InlineEditor width={500} height={300} />
				<InlineEditor width={600} height={400} />
				<InlineEditor width={700} height={500} />
				<InlineEditor width={900} height={600} />
			</div>
		</FocusedEditorContext.Provider>
	)
}

function InlineEditor({ width, height }: { width: number; height: number }) {
	const { focusedEditor, setFocusedEditor } = useContext(FocusedEditorContext)

	const title = `${width} x ${height}`

	const handleMount = (editor: Editor) => {
		editor.updateInstanceState({ isDebugMode: false })
	}

	return (
		<div>
			<h2>{title}</h2>
			<div style={{ width, height }} onFocus={() => setFocusedEditor(title)}>
				<Tldraw onMount={handleMount} autoFocus={focusedEditor === title} />
			</div>
		</div>
	)
}
