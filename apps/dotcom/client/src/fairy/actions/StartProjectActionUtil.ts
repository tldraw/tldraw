import { FairyProject, StartProjectAction, Streaming } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { addProject } from '../Projects'
import { AgentActionUtil } from './AgentActionUtil'

export class StartProjectActionUtil extends AgentActionUtil<StartProjectAction> {
	static override type = 'start-project' as const

	override getInfo(action: Streaming<StartProjectAction>) {
		return {
			icon: 'note' as const,
			description: action.complete
				? `Started project: ${action.projectName}`
				: 'Starting project...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<StartProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const projectId = uniqueId(5)

		// Make sure to include self in the project member ids
		if (!action.projectMemberIds.includes(this.agent.id)) {
			action.projectMemberIds.push(this.agent.id)
		}

		const project: FairyProject = {
			id: projectId,
			orchestratorId: this.agent.id,
			name: action.projectName,
			description: action.projectDescription,
			color: action.projectColor,
			memberIds: action.projectMemberIds,
		}

		// Add project to shared projects atom
		addProject(project)

		this.agent.schedule(
			`Project ${action.projectName} started. You are now the orchestrator of the project.`
		)
	}
}
