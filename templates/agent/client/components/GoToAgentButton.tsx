import {
	Box,
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	useEditor,
	useValue,
} from 'tldraw'
import { $agentViewportBoundsHighlight } from '../atoms/agentViewportBoundsHighlight'

export function GoToAgentButton() {
	const agentViewportBounds = useValue(
		'agentViewportBounds',
		() => $agentViewportBoundsHighlight.get(),
		[$agentViewportBoundsHighlight]
	)

	const editor = useEditor()
	const { showButton, arrowRotation } = useValue(
		'goToAgentState',
		() => {
			if (!agentViewportBounds) return { showButton: false, arrowRotation: 0 }

			const agentCenter = Box.From(agentViewportBounds).center
			const agentScreenCenter = editor.pageToViewport(agentCenter)
			const screenBounds = editor.getViewportScreenBounds()

			const agentScreenBounds = Box.From(agentViewportBounds).corners.map((corner) =>
				editor.pageToViewport(corner)
			)
			const agentScreenBox = Box.FromPoints(agentScreenBounds)

			const showButton = !agentScreenBox.collides(screenBounds)

			const angle = Math.atan2(agentScreenCenter.y, agentScreenCenter.x) * (180 / Math.PI)

			return { showButton, arrowRotation: angle }
		},
		[agentViewportBounds]
	)

	if (!showButton) return null

	const handleClick = () => {
		if (agentViewportBounds) {
			const agentCenter = Box.From(agentViewportBounds).center
			editor.centerOnPoint(agentCenter, { animation: { duration: 220 } })
		}
	}

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
								transform: `rotate(${arrowRotation}deg)`,
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
				<TldrawUiButtonLabel>Go to agent</TldrawUiButtonLabel>
			</div>
		</TldrawUiButton>
	)
}
