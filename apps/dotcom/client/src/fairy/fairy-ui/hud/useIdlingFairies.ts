import { useEffect, useMemo } from 'react'
import { useValue } from 'tldraw'
import { FairyAgent } from '../../fairy-agent/FairyAgent'
import { $fairyProjects } from '../../fairy-globals'

export function useIdlingFairies(agents: FairyAgent[]) {
	// Unused atm, wip
	// Check if any fairies in projects are idling
	const projects = useValue('fairy-projects', () => $fairyProjects.get(), [$fairyProjects])
	const badStateProjectIds = useMemo(() => {
		const projectIds = new Set<string>()
		for (const project of projects) {
			for (const member of project.members) {
				const agent = agents.find((a) => a.id === member.id)
				if (agent && agent.modeManager.getMode() === 'idling') {
					projectIds.add(project.id)
				}
			}
		}
		return Array.from(projectIds)
	}, [agents, projects])

	useEffect(() => {
		for (const project of projects) {
			if (badStateProjectIds.includes(project.id)) {
				for (const member of project.members) {
					const agent = agents.find((a) => a.id === member.id)
					if (agent && agent.modeManager.getMode() === 'idling') {
						const fairyName = agent.$fairyConfig.get()?.name ?? 'unknown'
						// eslint-disable-next-line no-console
						console.log(
							`Fairy in project but idling: projectId=${project.id}, fairyId=${agent.id}, name=${fairyName}`
						)
					}
				}
			}
		}
	}, [badStateProjectIds, agents, projects])
}
