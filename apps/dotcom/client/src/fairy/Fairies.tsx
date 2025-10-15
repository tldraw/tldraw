import { TldrawFairyAgent } from '@tldraw/fairy-shared'
import { useMemo } from 'react'
import Fairy from './Fairy'

export function Fairies({ agents }: { agents: TldrawFairyAgent[] }) {
	const activeAgents = useMemo(
		() => agents.filter((agent) => agent.$fairy.get() !== undefined),
		[agents]
	)

	return (
		<>
			{activeAgents.map((agent, i) => (
				<Fairy key={i} agent={agent} />
			))}
		</>
	)
}
