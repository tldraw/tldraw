import { EndCurrentProjectAction, Streaming } from '@tldraw/fairy-shared'
import { deleteProject } from '../FairyProjects'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { AgentActionUtil } from './AgentActionUtil'

export class EndCurrentProjectActionUtil extends AgentActionUtil<EndCurrentProjectAction> {
	static override type = 'end-project' as const

	override getInfo(action: Streaming<EndCurrentProjectAction>) {
		return {
			icon: 'note' as const,
			description: action.complete ? 'Ended current project' : 'Ending current project...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<EndCurrentProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const project = this.agent.getProject()
		if (!project) return // todo error

		const membersIds = project.members.map((member) => member.id)
		const memberAgents = $fairyAgentsAtom
			.get(this.editor)
			.filter((agent) => membersIds.includes(agent.id))

		memberAgents.forEach((memberAgent) => {
			memberAgent.setMode('idling')
		})

		deleteProject(project.id)
	}
}
