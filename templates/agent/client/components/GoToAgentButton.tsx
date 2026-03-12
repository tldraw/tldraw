import { useCallback } from 'react'
import {
	Box,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	useEditor,
	useValue,
	Vec,
} from 'tldraw'
import { TldrawAgent } from '../agent/TldrawAgent'
import { useAgents } from '../agent/TldrawAgentAppProvider'

/**
 * Renders GoToAgentButton for all agents.
 */
export function GoToAgentButtons() {
	const agents = useAgents()

	return (
		<>
			{agents.map((agent) => (
				<GoToAgentButton key={agent.id} agent={agent} />
			))}
		</>
	)
}

/**
 * A button that zooms the viewport to show where an agent is working.
 */
export function GoToAgentButton({ agent }: { agent: TldrawAgent }) {
	const editor = useEditor()
	const currentRequest = useValue('activeRequest', () => agent.requests.getActiveRequest(), [agent])
	const agentViewport = currentRequest?.bounds

	// We only show the button if the agent is offscreen
	const agentIsOffscreen = useValue(
		'agentIsOffscreen',
		() => {
			if (!agentViewport) return false
			const screenBounds = editor.getViewportScreenBounds()
			const agentViewportScreenCorners = Box.From(agentViewport).corners.map((corner) =>
				editor.pageToViewport(corner)
			)

			return !Box.FromPoints(agentViewportScreenCorners).collides(screenBounds)
		},
		[agentViewport]
	)

	// The button's arrow points towards the agent
	const angleToAgent = useValue(
		'angleToAgent',
		() => {
			if (!agentViewport) return
			if (agentIsOffscreen) return

			const agentCenter = Box.From(agentViewport).center
			const agentScreenCenter = editor.pageToViewport(agentCenter)
			const screenBounds = editor.getViewportScreenBounds()
			const screenCenter = Box.From(screenBounds).center
			const displacement = Vec.From(agentScreenCenter).sub(screenCenter)
			return Math.atan2(displacement.y, displacement.x) * (180 / Math.PI)
		},
		[agentViewport]
	)

	const handleClick = useCallback(() => {
		if (agentViewport) {
			const bounds = Box.From(agentViewport).expandBy(50)
			editor.zoomToBounds(bounds, { animation: { duration: 220 } })
		}
	}, [agentViewport, editor])

	if (!agentViewport) return null
	if (!agentIsOffscreen) return null

	return (
		<TldrawUiButton type="low" onClick={handleClick}>
			<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				<TldrawUiButtonIcon
					icon={
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							style={{
								transform: `rotate(${angleToAgent}deg)`,
								transition: 'transform 0.2s ease',
							}}
						>
							<path
								d="M8 6l6 6-6 6"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
						</svg>
					}
				/>
				<TldrawUiButtonLabel>Go to {agent.id}</TldrawUiButtonLabel>
			</div>
		</TldrawUiButton>
	)
}
