import { useEffect, useMemo, useState } from 'react'
import {
	DefaultSizeStyle,
	Editor,
	ErrorBoundary,
	TLComponents,
	Tldraw,
	TldrawUiToastsProvider,
	TLUiOverrides,
	useEditor,
} from 'tldraw'
import { TldrawAgent } from './agent/TldrawAgent'
import { useTldrawAgent } from './agent/useTldrawAgent'
import { ChatPanel } from './components/ChatPanel'
import { ChatPanelFallback } from './components/ChatPanelFallback'
import { CustomHelperButtons } from './components/CustomHelperButtons'
import { AgentViewportBoundsHighlight } from './components/highlights/AgentViewportBoundsHighlights'
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

const tools = [TargetShapeTool, TargetAreaTool]

function App() {
	const [editor, setEditor] = useState<Editor | undefined>()
	const [agent, setAgent] = useState<TldrawAgent | undefined>()

	const components: TLComponents = useMemo(
		() => ({
			HelperButtons: () => <CustomHelperButtons agent={agent} />,
			InFrontOfTheCanvas: () =>
				agent && (
					<>
						<AgentViewportBoundsHighlight agent={agent} />
						<ContextHighlights agent={agent} />
					</>
				),
		}),
		[agent]
	)

	return (
		<TldrawUiToastsProvider>
			<div className="tldraw-agent-container">
				<div className="tldraw-canvas">
					<Tldraw
						persistenceKey="tldraw-agent-demo"
						tools={tools}
						overrides={overrides}
						components={components}
					>
						<AppInner setEditor={setEditor} setAgent={setAgent} />
					</Tldraw>
				</div>
				<ErrorBoundary fallback={ChatPanelFallback}>
					{editor && agent && <ChatPanel agent={agent} />}
				</ErrorBoundary>
			</div>
		</TldrawUiToastsProvider>
	)
}

function AppInner({
	setEditor,
	setAgent,
}: {
	setEditor: (editor: Editor) => void
	setAgent: (agent: TldrawAgent) => void
}) {
	const editor = useEditor()
	const agent = useTldrawAgent(editor)

	useEffect(() => {
		if (!editor || !agent) return
		setEditor(editor)
		setAgent(agent)
		;(window as any).editor = editor
		;(window as any).agent = agent
	}, [agent, editor, setEditor, setAgent])

	return null
}

export default App
