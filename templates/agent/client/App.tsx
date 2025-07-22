import { useCallback, useState } from 'react'
import { Editor, ErrorBoundary, Tldraw, TLUiOverrides } from 'tldraw'
import { ChatPanel } from './ChatPanel'
import { overrideFillStyleWithLinedFillStyle } from './LinedFillStyle'
import { TargetAreaTool } from './TargetAreaTool'
import { TargetShapeTool } from './TargetShapeTool'

overrideFillStyleWithLinedFillStyle()

const customUiOverrides: TLUiOverrides = {
	tools: (editor, tools) => {
		return {
			...tools,
			'target-area': {
				id: 'target-area',
				label: 'Pick Area',
				kbd: 'c',
				icon: 'tool-frame',
				onSelect() {
					editor.setCurrentTool('target-area')
				},
			},
			'target-shape': {
				id: 'target-shape',
				label: 'Pick Shape',
				kbd: 's',
				icon: 'tool-frame',
				onSelect() {
					editor.setCurrentTool('target-shape')
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
			return { ...next, meta: { ...next.meta, text } }
		})
	}, [])

	const tools = [TargetShapeTool, TargetAreaTool]

	return (
		<div className="tldraw-ai-container">
			<div className="tldraw-canvas">
				<Tldraw
					persistenceKey="tldraw-agent-demo"
					onMount={handleMount}
					tools={tools}
					overrides={customUiOverrides}
				/>
			</div>
			<ErrorBoundary fallback={ChatPanelFallback}>
				{editor && <ChatPanel editor={editor} />}
			</ErrorBoundary>
		</div>
	)
}

function ChatPanelFallback() {
	return (
		<div className="chat-panel-fallback">
			<p>Error loading chat history</p>
			<button
				className="chat-panel-fallback-button"
				onClick={() => {
					localStorage.removeItem('chat-history-items')
					window.location.reload()
				}}
			>
				Clear chat history
			</button>
		</div>
	)
}

export default App
