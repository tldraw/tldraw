import { TldrawFairyAgent } from '@tldraw/fairy-shared'
import { useMemo } from 'react'
import FairyInner from './FairyInner'

export function FairyWrapper({ agents }: { agents: TldrawFairyAgent[] }) {
	const activeAgents = useMemo(
		() => agents.filter((agent) => agent.$fairy.get() !== undefined),
		[agents]
	)

	return (
		<>
			{activeAgents.map((agent, i) => (
				<FairyInner key={i} agent={agent} />
			))}
		</>
	)
}
