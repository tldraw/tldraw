import { useCallback, useState } from 'react'
import { Editor, Tldraw } from 'tldraw'
import { AgentSidebar } from './sidebar/AgentSidebar'

function App() {
	const [editor, setEditor] = useState<Editor | null>(null)

	const handleMount = useCallback((editor: Editor) => {
		setEditor(editor)
		editor.sideEffects.registerBeforeChangeHandler('shape', (_prev, next, source) => {
			if (source !== 'user') return next
			const shapeUtil = editor.getShapeUtil(next.type)
			const text = shapeUtil.getText(next)
			return {
				...next,
				meta: {
					text,
				},
			}
		})
	}, [])

	return (
		<div className="tldraw-ai-container">
			<Tldraw persistenceKey="tldraw-ai-demo-2" onMount={handleMount} />
			{editor && <AgentSidebar />}
		</div>
	)
}

export default App
