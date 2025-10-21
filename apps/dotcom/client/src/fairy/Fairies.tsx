import { useMemo } from 'react'
import Fairy from './Fairy'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function Fairies({ agents }: { agents: FairyAgent[] }) {
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
