import { Box, useEditor, useValue } from 'tldraw'
import { $agentViewportBoundsHighlight } from '../../atoms/agentViewportBoundsHighlight'
import { AreaHighlight } from './AreaHighlight'

export function AgentViewportBoundsHighlight() {
	const agentViewportBounds = useValue(
		'agentViewportBounds',
		() => $agentViewportBoundsHighlight.get(),
		[$agentViewportBoundsHighlight]
	)

	const editor = useEditor()
	const screenBounds = useValue(
		'screenBounds',
		() => {
			if (!agentViewportBounds) return null
			const expandedPageBounds = Box.From(agentViewportBounds).expandBy(4)
			const screenCorners = expandedPageBounds.corners.map((corner) => {
				return editor.pageToViewport(corner)
			})
			return Box.FromPoints(screenCorners)
		},
		[agentViewportBounds]
	)

	if (!agentViewportBounds || !screenBounds) return null
	return (
		<>
			<AreaHighlight
				key="prompt-bounds-highlight"
				pageBounds={agentViewportBounds}
				color="var(--tl-color-tooltip)"
				generating={true}
				label="Agent view"
			/>
		</>
	)
}
