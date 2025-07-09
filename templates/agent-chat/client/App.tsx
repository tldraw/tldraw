import { useCallback, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import { ChatPanel } from './ChatPanel'

function App() {
	const [editor, setEditor] = useState<Editor | null>(null)

	const handleMount = useCallback((editor: Editor) => {
		setEditor(editor)
		editor.sideEffects.registerBeforeChangeHandler('shape', (_prev, next, source) => {
			if (source !== 'user') return next
			const shapeUtil = editor.getShapeUtil(next.type)
			const text = shapeUtil.getText(next)
			if (text === undefined) return next
			return { ...next, meta: { text } }
		})
	}, [])

	return (
		<div className="tldraw-ai-container">
			<div className="tldraw-canvas">
				<Tldraw persistenceKey="tldraw-ai-demo-2" onMount={handleMount} />
			</div>
			{editor && <ChatPanel editor={editor} />}
		</div>
	)
}

export default App
