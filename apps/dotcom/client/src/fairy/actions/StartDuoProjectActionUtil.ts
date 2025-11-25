import { StartDuoProjectAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyProjects, getProjectByAgentId, updateProject } from '../FairyProjects'
import { AgentActionUtil } from './AgentActionUtil'

export class StartDuoProjectActionUtil extends AgentActionUtil<StartDuoProjectAction> {
	static override type = 'start-duo-project' as const

	override getInfo(action: Streaming<StartDuoProjectAction>) {
		return {
			icon: 'flag' as const,
			description: action.complete
				? `Started project: ${action.projectName}`
				: 'Starting project...',
			pose: 'reading' as const,
			canGroup: () => false,
		}
	}

	override applyAction(action: Streaming<StartDuoProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		// Assumptions:
		// FairyGroupChat already handles creating the project, assigning roles programmatically as well as prompting the duo orchestrator

		const { projectName, projectDescription, projectColor, projectPlan } = action

		const project = getProjectByAgentId(this.agent.id)
		if (!project) return // todo error

		const colorAlreadyChosen = $fairyProjects.get().some((p) => p.color === projectColor)
		if (colorAlreadyChosen) {
			this.agent.interrupt({
				input: `The color ${projectColor} has already been chosen for another project. Please choose a different color.`,
			})
			return
		}

		updateProject(project.id, {
			title: projectName,
			description: projectDescription,
			plan: projectPlan,
			color: projectColor,
		})
	}
}
