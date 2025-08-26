import { useState } from 'react'
import {
	DefaultSizeStyle,
	Editor,
	ErrorBoundary,
	TLComponents,
	Tldraw,
	TldrawUiToastsProvider,
	TLUiOverrides,
} from 'tldraw'
import { ChatPanel } from './components/ChatPanel'
import { ChatPanelFallback } from './components/ChatPanelFallback'
import { ContextBoundsHighlights } from './components/highlights/ContextBoundsHighlights'
import { ContextHighlights } from './components/highlights/ContextHighlights'
import { enableLinedFillStyle } from './enableLinedFillStyle'
import { TargetAreaTool } from './tools/TargetAreaTool'
import { TargetShapeTool } from './tools/TargetShapeTool'

enableLinedFillStyle()
DefaultSizeStyle.setDefaultValue('s')

const overrides: TLUiOverrides = {
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

const components: TLComponents = {
	InFrontOfTheCanvas: () => (
		<>
			<ContextBoundsHighlights />
			<ContextHighlights />
		</>
	),
}

const tools = [TargetShapeTool, TargetAreaTool]

function App() {
	const [editor, setEditor] = useState<Editor | undefined>()

	return (
		<TldrawUiToastsProvider>
			<div className="tldraw-agent-container">
				<div className="tldraw-canvas">
					<Tldraw
						persistenceKey="tldraw-agent-demo"
						onMount={setEditor}
						tools={tools}
						overrides={overrides}
						components={components}
					/>
				</div>
				<ErrorBoundary fallback={ChatPanelFallback}>
					{editor && <ChatPanel editor={editor} />}
				</ErrorBoundary>
			</div>
		</TldrawUiToastsProvider>
	)
}

export default App
