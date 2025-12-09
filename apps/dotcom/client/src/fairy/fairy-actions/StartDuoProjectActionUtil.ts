import {
	FairyProject,
	ProjectColorSchema,
	StartDuoProjectAction,
	Streaming,
	createAgentActionInfo,
} from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class StartDuoProjectActionUtil extends AgentActionUtil<StartDuoProjectAction> {
	static override type = 'start-duo-project' as const

	override getInfo(action: Streaming<StartDuoProjectAction>) {
		return createAgentActionInfo({
			icon: 'flag',
			description: action.complete
				? `Planned project: ${action.projectName}`
				: `Planning project${action.projectName ? `: ${action.projectName}` : ''}${action.projectDescription ? `\n\n${action.projectDescription}` : ''}${action.projectPlan ? `\n\n${action.projectPlan}` : ''}`,
			ircMessage: action.complete ? `I planned the project: ${action.projectName}` : null,
			pose: 'writing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<StartDuoProjectAction>, _helpers: AgentHelpers) {
		if (!this.agent) return

		// Assumptions:
		// FairyGroupChat already handles creating the project, assigning roles programmatically as well as prompting the duo orchestrator
		const project = this.agent.fairyApp.projects.getProjectByAgentId(this.agent.id)
		if (!project) {
			if (!action.complete) return
			this.agent.interrupt({
				input:
					'You are not currently part of a project. A project must be created before you can start it.',
			})
			return
		}

		if (action.projectName) {
			this.agent.fairyApp.projects.updateProject(project.id, {
				title: action.projectName,
			})
		}

		const isProjectColorValid = ProjectColorSchema.safeParse(action.projectColor).success
		if (isProjectColorValid) {
			const { projectColor } = action
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

			if (project.color === '') {
				this.agent.fairyApp.projects.updateProject(project.id, {
					color: projectColor,
				})
			}
		}

		if (!action.complete) return

		this.agent.fairyApp.projects.updateProject(project.id, {
			title: action.projectName,
			description: action.projectDescription,
			plan: action.projectPlan,
			color: action.projectColor,
		})
	}
}
