import { useEffect, useMemo } from 'react'
import {
	DefaultSizeStyle,
	ErrorBoundary,
	TLComponents,
	Tldraw,
	TldrawUiToastsProvider,
	TLUiOverrides,
	useEditor,
} from 'tldraw'
import { AgentProvider } from './agent/AgentContext'
import { useTldrawAgent } from './agent/useTldrawAgent'
import { ChatPanel } from './components/ChatPanel'
import { ChatPanelFallback } from './components/ChatPanelFallback'
import { CustomHelperButtons } from './components/CustomHelperButtons'
import { AgentViewportBoundsHighlight } from './components/highlights/AgentViewportBoundsHighlights'
import { ContextHighlights } from './components/highlights/ContextHighlights'
import { TargetAreaTool } from './tools/TargetAreaTool'
import { TargetShapeTool } from './tools/TargetShapeTool'

/**
 * The ID used for this project's agent.
 * If you want to support multiple agents, you can use a different ID for each agent.
 */
export const AGENT_ID = 'agent-starter'

// Customize tldraw's styles to play to the agent's strengths
DefaultSizeStyle.setDefaultValue('s')

// Custom tools for picking context items
const tools = [TargetShapeTool, TargetAreaTool]
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

function App() {
	// Custom components to visualize what the agent is doing
	const components: TLComponents = useMemo(() => {
		return {
			HelperButtons: () => (
				<AgentProvider agentId={AGENT_ID}>
					<CustomHelperButtons />
				</AgentProvider>
			),
			InFrontOfTheCanvas: () => (
				<AgentProvider agentId={AGENT_ID}>
					<AgentViewportBoundsHighlight />
					<ContextHighlights />
				</AgentProvider>
			),
		}
	}, [])

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
						<AppInner />
					</Tldraw>
				</div>
				<ErrorBoundary fallback={ChatPanelFallback}>
					<AgentProvider agentId={AGENT_ID}>
						<ChatPanel />
					</AgentProvider>
				</ErrorBoundary>
			</div>
		</TldrawUiToastsProvider>
	)
}

function AppInner() {
	const editor = useEditor()
	const agent = useTldrawAgent(editor, AGENT_ID)

	useEffect(() => {
		if (!editor || !agent) return
		;(window as any).editor = editor
		;(window as any).agent = agent
	}, [agent, editor])

	return null
}

export default App
