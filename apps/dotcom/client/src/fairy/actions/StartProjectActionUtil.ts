import { FairyProject, StartProjectAction, Streaming } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyAgentById } from '../fairy-agent/agent/fairyAgentsAtom'
import { $projects, addProject } from '../Projects'
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

		const messages: string[] = []

		// Make sure to include self in the project member ids
		if (!action.projectMemberIds.includes(this.agent.id)) {
			action.projectMemberIds.push(this.agent.id)
		}

		// Check if any proposed member IDs have an active project
		const existingProjects = $projects.get()
		for (const memberId of action.projectMemberIds) {
			const memberProject = existingProjects.find((project) => project.memberIds.includes(memberId))
			if (memberProject) {
				const memberAgent = getFairyAgentById(memberId, this.editor)
				const memberName = memberAgent?.$fairyConfig.get().name ?? memberId
				messages.push(
					`${memberName} (id: ${memberId}) is already a member of project: ${memberProject.name}`
				)
			}
		}

		// Check if the proposed color is already used by an existing project
		const colorConflict = existingProjects.find((project) => project.color === action.projectColor)
		if (colorConflict) {
			messages.push(
				`The color ${action.projectColor} is already used by project: ${colorConflict.name}`
			)
		}

		// If there are validation errors, cancel generation and schedule messages
		if (messages.length > 0) {
			this.agent.cancel()
			this.agent.schedule({ messages })
			return
		}

		const projectId = uniqueId(5)

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
