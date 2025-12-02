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
			pose: 'writing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<StartProjectAction>, _helpers: AgentHelpers) {
		if (!this.agent) return

		// Assumptions:
		// FairyGroupChat already handles creating the project, assigning roles programmatically as well as prompting the orchestrator

		const { projectName, projectDescription, projectColor, projectPlan } = action

		// the fields of streaming actions always stream in in the same order, so if projectName and the field that comes after it (projectDescription) are in the action, we know the projectName is finished streaming in and we can use it
		const finishedProjectName =
			'projectName' in action && 'projectDescription' in action ? projectName : undefined
		const finishedProjectColor =
			'projectColor' in action && 'projectPlan' in action ? projectColor : undefined

		const project = this.agent.fairyApp.projects.getProjectByAgentId(this.agent.id)
		if (!project) {
			if (!action.complete) return
			this.agent.interrupt({
				input:
					'You are not currently part of a project. A project must be created before you can start it.',
			})
			return
		}

		if (finishedProjectName && !project.title) {
			this.agent.fairyApp.projects.updateProject(project.id, {
				title: finishedProjectName,
			})
		}

		if (finishedProjectColor && finishedProjectColor) {
			this.agent.fairyApp.projects.updateProject(project.id, {
				color: finishedProjectColor,
			})
		}

		// Only validate color when we have a complete color value to check
		if (projectColor && typeof projectColor === 'string' && projectColor.trim() !== '') {
			const colorAlreadyChosen = this.agent.fairyApp.projects
				.getProjects()
				.some((p: FairyProject) => p.id !== project.id && p.color === projectColor)
			if (colorAlreadyChosen) {
				if (!action.complete) return
				this.agent.interrupt({
					input: `The color ${projectColor} is not available at the moment. Please choose a different color.`,
				})
				return
			}
		}

		if (!action.complete) return

		this.agent.fairyApp.projects.updateProject(project.id, {
			title: projectName,
			description: projectDescription,
			plan: projectPlan,
			color: projectColor,
		})
	}
}
