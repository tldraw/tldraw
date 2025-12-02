import {
	FairyProject,
	StartProjectAction,
	Streaming,
	createAgentActionInfo,
} from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class StartProjectActionUtil extends AgentActionUtil<StartProjectAction> {
	static override type = 'start-project' as const

	override getInfo(action: Streaming<StartProjectAction>) {
		return createAgentActionInfo({
			icon: 'flag',
			description: action.complete
				? `Planned project: ${action.projectName}`
				: `Planning project${action.projectName ? `: ${action.projectName}` : ''}${action.projectDescription ? `\n\n${action.projectDescription}` : ''}${action.projectPlan ? `\n\n${action.projectPlan}` : ''}`,
			pose: 'reading',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<StartProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		// Assumptions:
		// FairyGroupChat already handles creating the project, assigning roles programmatically as well as prompting the orchestrator

		const { projectName, projectDescription, projectColor, projectPlan } = action

		const project = this.agent.fairyApp.projects.getProjectByAgentId(this.agent.id)
		if (!project) {
			this.agent.interrupt({
				input:
					'You are not currently part of a project. A project must be created before you can start it.',
			})
			return
		}

		const colorAlreadyChosen = this.agent.fairyApp.projects
			.getProjects()
			.some((p: FairyProject) => p.color === projectColor)
		if (colorAlreadyChosen || projectColor === 'white') {
			this.agent.interrupt({
				input: `The color ${projectColor} is not available at the moment. Please choose a different color.`,
			})
			return
		}

		this.agent.fairyApp.projects.updateProject(project.id, {
			title: projectName,
			description: projectDescription,
			plan: projectPlan,
			color: projectColor,
		})
	}
}
