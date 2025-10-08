import { useEffect, useMemo, useState } from 'react'
import {
	DefaultSizeStyle,
	DefaultSpinner,
	reverseRecordsDiff,
	TLComponents,
	Tldraw,
	TldrawUiToastsProvider,
	TLUiOverrides,
	useEditor,
	useValue,
} from 'tldraw'
import { TldrawAgent } from './agent/TldrawAgent'
import { useTldrawAgent } from './agent/useTldrawAgent'
import { CustomHelperButtons } from './components/CustomHelperButtons'
import { AgentViewportBoundsHighlight } from './components/highlights/AgentViewportBoundsHighlights'
import { ContextHighlights } from './components/highlights/ContextHighlights'
import { enableLinedFillStyle } from './enableLinedFillStyle'
import { TargetAreaTool } from './tools/TargetAreaTool'
import { TargetShapeTool } from './tools/TargetShapeTool'

/**
 * The ID used for this project's agent.
 * If you want to support multiple agents, you can use a different ID for each agent.
 */
export const AGENT_ID = 'agent-starter'

// Customize tldraw's styles to play to the agent's strengths
DefaultSizeStyle.setDefaultValue('s')
enableLinedFillStyle()

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

const reviewerGuidelines = `
# Reviewer guidelines

You are a wise and intelligent teacher. You are presented with a student's completed work and it is your job to helpfully review their work, giving helpful and constructive feedback, and praise.

There are two dimensions you should consider when reviewing the work:
- Whether the work is correct or not.
- Whether the student has shown their working or not.

Showing working is the most important part. Has the student filled in the provided template? Or have they left anything blank? If they haven't shown their working, encourage them to do so. You can communicate with them by creating text shapes and filling it with your comment. The student cannot see your messages from your message action. Only the teacher of the class can see those. To communicate with the student, you must create shapes on the canvas.

Only tell the student if the answer is correct or incorrect if they have shown their working. To check their working, work through their work step by step, checking each step to see if it is correct or incorrect. Help them find the mistake.

## Rules

- Never tell the student the answer. Only guide them towards it.
- Always write your comments to the right-hand-side of the work so that it doesn't overlap with the work. Make sure you place it around any other content, not on top of it. This is important because the student needs to be able to read your comments and they can't do that if it's on top of something else.
- Remember, the text wrap will make your text shapes multiple lines tall. Space out your comments so that they are not on top of each other. Your outputted text is slightly larger and taller than you might expect so scale it down (You want to be using small font sizes). It's better for your text to be too small than too big.
- Be brief and supportive.
- Use multiple text shapes to make different points.
- Use arrow shapes from your text shapes to refer to different parts of the work.

`

type ClassState = 'answering' | 'marking'

function App() {
	const [agent, setAgent] = useState<TldrawAgent | undefined>()

	// Custom components to visualize what the agent is doing
	const components: TLComponents = useMemo(() => {
		return {
			HelperButtons: () => agent && <CustomHelperButtons agent={agent} />,
			InFrontOfTheCanvas: () => (
				<>
					{agent && <AgentViewportBoundsHighlight agent={agent} />}
					{agent && <ContextHighlights agent={agent} />}
				</>
			),
			SharePanel: () => {
				const isGenerating = useValue('is generating', () => agent?.isGenerating(), [agent])

				const [classState, setClassState] = useState<ClassState>('answering')
				return (
					<button
						style={{
							backgroundColor: 'var(--tl-color-primary)',
							color: 'white',
							borderRadius: 'var(--tl-radius-2)',
							padding: '8px',
							cursor: 'pointer',
							margin: '4px 8px',
							fontSize: '12px',
							border: 'none',
							pointerEvents: 'all',
							fontFamily: 'var(--tl-font-family-2)',
							height: '32px',
							minWidth: '90px',
						}}
						onClick={async () => {
							if (!agent) return

							if (classState === 'answering') {
								setClassState('marking')
								agent.reset()
								await agent.prompt(reviewerGuidelines)
							} else if (classState === 'marking') {
								// Go through chat history and revert all agent changes
								const chatHistory = agent.$chatHistory.get()
								for (const item of chatHistory) {
									if (item.type === 'action') {
										agent.editor.store.applyDiff(reverseRecordsDiff(item.diff))
									}
								}
								setClassState('answering')
							}
						}}
					>
						{isGenerating ? (
							<DefaultSpinner />
						) : classState === 'answering' ? (
							'Review work'
						) : (
							'Try again'
						)}
					</button>
				)
			},
		}
	}, [agent])

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
						<AppInner setAgent={setAgent} />
					</Tldraw>
				</div>
				{/* <ErrorBoundary fallback={ChatPanelFallback}> */}
				{/* {agent && <ChatPanel agent={agent} />} */}
				{/* </ErrorBoundary> */}
			</div>
		</TldrawUiToastsProvider>
	)
}

function AppInner({ setAgent }: { setAgent: (agent: TldrawAgent) => void }) {
	const editor = useEditor()
	const agent = useTldrawAgent(editor, AGENT_ID)

	useEffect(() => {
		if (!editor || !agent) return
		setAgent(agent)
		;(window as any).editor = editor
		;(window as any).agent = agent
	}, [agent, editor, setAgent])

	return null
}

export default App
