import { StartProjectAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getProjectByAgentId, updateProject } from '../FairyProjects'
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

		// Assumptions:
		// FairyGroupChat already handles creating the project, assigning roles programmatically as well as prompting the orchestrator

		const { projectName, projectDescription, projectColor } = action

		const project = getProjectByAgentId(this.agent.id)
		if (!project) return // todo error

		updateProject(project.id, {
			title: projectName,
			description: projectDescription,
			color: projectColor,
		})
	}
}
