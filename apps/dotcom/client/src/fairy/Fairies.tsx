import { useMemo } from 'react'
import Fairy from './Fairy'
import { FairyAgent } from './fairy-agent/agent/FairyAgent'

export function Fairies({
	agents,
	onDeleteFairyConfig,
}: {
	agents: FairyAgent[]
	onDeleteFairyConfig(id: string): void
}) {
	const activeAgents = useMemo(
		() => agents.filter((agent) => agent.$fairyEntity.get() !== undefined),
		[agents]
	)

	return (
		<>
			{activeAgents.map((agent, i) => (
				<Fairy key={i} agent={agent} onDeleteFairyConfig={onDeleteFairyConfig} />
			))}
		</>
	)
}
