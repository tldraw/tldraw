import { useValue } from 'tldraw'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { AreaHighlight } from './AreaHighlight'

export function AgentViewportBoundsHighlight({ agent }: { agent: TldrawAgent }) {
	const agentViewportBounds = useValue(
		'agentViewportBounds',
		() => agent.$agentViewportBoundsHighlight.get(),
		[agent.$agentViewportBoundsHighlight]
	)

	if (!agentViewportBounds) return null

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
