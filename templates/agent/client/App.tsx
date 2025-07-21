import { useCallback, useState } from 'react'
import { Editor, Tldraw, TLUiOverrides } from 'tldraw'
import { ChatPanel } from './ChatPanel'
import { overrideFillStyleWithLinedFillStyle } from './LinedFillStyle'
import { ShapeSnapshotInner, ShapesSnapshotProvider } from './ShapesSnapshot'
import { TargetTool } from './TargetTool'

overrideFillStyleWithLinedFillStyle()

const customUiOverrides: TLUiOverrides = {
	tools: (editor, tools) => {
		return {
			...tools,
			screenshot: {
				id: 'target',
				label: 'Target',
				kbd: 'c',
				icon: 'tool-frame',
				onSelect() {
					editor.setCurrentTool('target')
				},
			},
		}
	},
}

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

	const tools = [TargetTool]

	return (
		<ShapesSnapshotProvider>
			<div className="tldraw-ai-container">
				<div className="tldraw-canvas">
					<Tldraw
						persistenceKey="tldraw-agent-demo"
						onMount={handleMount}
						tools={tools}
						overrides={customUiOverrides}
					>
						<ShapeSnapshotInner />
					</Tldraw>
				</div>
				{editor && <ChatPanel editor={editor} />}
			</div>
		</ShapesSnapshotProvider>
	)
}

export default App
