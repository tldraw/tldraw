import { Box, useValue } from 'tldraw'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { AreaHighlight } from './AreaHighlight'

export function AgentViewportBoundsHighlight({ agent }: { agent: TldrawAgent }) {
	const currentRequest = useValue(agent.$activeRequest)
	const agentViewportBounds = currentRequest?.bounds

	// If the agent's viewport is equivalent to a pending context area, don't show the highlight
	// (because it would overlap and be redundant)
	const isEquivalentToPendingContextArea = useValue(
		'isEquivalentToPendingContextArea',
		() => {
			if (!agentViewportBounds) return false
			const contextItems = currentRequest.contextItems
			return contextItems.some(
				(item) =>
					item.type === 'area' &&
					item.source === 'agent' &&
					Box.Equals(item.bounds, agentViewportBounds)
			)
		},
		[agentViewportBounds]
	)

	if (!agentViewportBounds) return null
	if (isEquivalentToPendingContextArea) return null

	return (
		<AreaHighlight
			key="prompt-bounds-highlight"
			pageBounds={agentViewportBounds}
			color="var(--tl-color-tooltip)"
			generating={true}
			label="Agent view"
		/>
	)
}
