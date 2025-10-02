import { useEffect, useMemo, useState } from 'react'
import {
	createShapeId,
	DefaultSizeStyle,
	onDragFromToolbarToCreateShape,
	TLComponents,
	Tldraw,
	TldrawUiToastsProvider,
	TLUiOverrides,
	useEditor,
} from 'tldraw'
import { TldrawAgent } from './agent/TldrawAgent'
import { useTldrawAgent } from './agent/useTldrawAgent'
import { CustomHelperButtons } from './components/CustomHelperButtons'
import { CustomToolbar } from './components/CustomToolbar'
import { AgentViewportBoundsHighlight } from './components/highlights/AgentViewportBoundsHighlights'
import { ContextHighlights } from './components/highlights/ContextHighlights'
import { enableLinedFillStyle } from './enableLinedFillStyle'
import { FairyShapeUtil } from './shapes/FairyShapeUtil'
import { FairyTool } from './tools/FairyTool'
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

// Custom shapes and tools
const customShapeUtils = [FairyShapeUtil]
const customTools = [FairyTool, TargetShapeTool, TargetAreaTool]
const overrides: TLUiOverrides = {
	tools: (editor, tools) => {
		return {
			...tools,
			fairy: {
				id: 'fairy',
				label: 'Fairy',
				icon: 'color',
				onSelect() {
					// Get the toolbar button's position
					const toolbarButton = document.querySelector('[data-testid="tools.fairy"]')
					let startX = 0
					let startY = 0

					if (toolbarButton) {
						const buttonRect = toolbarButton.getBoundingClientRect()
						const screenPoint = {
							x: buttonRect.left + buttonRect.width / 2,
							y: buttonRect.top + buttonRect.height / 2,
						}
						const pagePoint = editor.screenToPage(screenPoint)
						startX = pagePoint.x - 50
						startY = pagePoint.y - 50
					}

					// Find an empty spot for the fairy
					const center = editor.getViewportPageBounds().center
					const FAIRY_SIZE = 100
					let endX = center.x - 50
					let endY = center.y - 50

					// Check if there's already a shape at the center position
					const existingShapes = editor.getCurrentPageShapes()
					const isSpotTaken = (x: number, y: number) => {
						return existingShapes.some((shape) => {
							const bounds = editor.getShapePageBounds(shape.id)
							if (!bounds) return false
							// Check if shapes overlap
							return !(
								x + FAIRY_SIZE < bounds.x ||
								x > bounds.x + bounds.width ||
								y + FAIRY_SIZE < bounds.y ||
								y > bounds.y + bounds.height
							)
						})
					}

					// If center is taken, spiral outward to find an empty spot
					if (isSpotTaken(endX, endY)) {
						let found = false
						let radius = FAIRY_SIZE * 1.2
						const maxAttempts = 20

						for (let attempt = 0; attempt < maxAttempts && !found; attempt++) {
							const angle = (attempt * Math.PI * 2) / 8 // 8 positions per ring
							const testX = center.x - 50 + Math.cos(angle) * radius
							const testY = center.y - 50 + Math.sin(angle) * radius

							if (!isSpotTaken(testX, testY)) {
								endX = testX
								endY = testY
								found = true
							}

							// Increase radius after checking all angles
							if ((attempt + 1) % 8 === 0) {
								radius += FAIRY_SIZE * 0.8
							}
						}
					}

					// Pick a random color (excluding black, grey, and white)
					const colorOptions = [
						'light-violet',
						'violet',
						'blue',
						'light-blue',
						'yellow',
						'orange',
						'green',
						'light-green',
						'light-red',
						'red',
					]
					const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)]

					// Create the fairy shape at the toolbar position with random color
					const shapeId = createShapeId()
					editor.createShape({
						id: shapeId,
						type: 'fairy',
						x: startX,
						y: startY,
						props: {
							color: randomColor,
						},
					})

					// Animate to target position using editor's animation API
					editor.animateShape(
						{
							id: shapeId,
							type: 'fairy',
							x: endX,
							y: endY,
						},
						{
							animation: {
								duration: 500,
								easing: (t) => 1 - (1 - t) * (1 - t), // ease-out quad
							},
						}
					)
				},
				onDragStart(_, info) {
					// Pick a random color (excluding black, grey, and white)
					const colorOptions = [
						'light-violet',
						'violet',
						'blue',
						'light-blue',
						'yellow',
						'orange',
						'green',
						'light-green',
						'light-red',
						'red',
					]
					const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)]

					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) => {
							editor.createShape({
								id,
								type: 'fairy',
								props: {
									color: randomColor,
								},
							})
						},
					})
				},
			},
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
	const [agent, setAgent] = useState<TldrawAgent | undefined>()

	// Custom components to visualize what the agent is doing
	const components: TLComponents = useMemo(() => {
		return {
			Toolbar: CustomToolbar,
			HelperButtons: () => agent && <CustomHelperButtons agent={agent} />,
			InFrontOfTheCanvas: () => (
				<>
					{agent && <AgentViewportBoundsHighlight agent={agent} />}
					{agent && <ContextHighlights agent={agent} />}
				</>
			),
		}
	}, [agent])

	return (
		<TldrawUiToastsProvider>
			<div className="tldraw-agent-container">
				<div className="tldraw-canvas">
					<Tldraw
						persistenceKey="tldraw-agent-demo"
						shapeUtils={customShapeUtils}
						tools={customTools}
						overrides={overrides}
						components={components}
					>
						<AppInner setAgent={setAgent} />
					</Tldraw>
				</div>
				{/* <ErrorBoundary fallback={ChatPanelFallback}>
					{agent && <ChatPanel agent={agent} />}
				</ErrorBoundary> */}
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
