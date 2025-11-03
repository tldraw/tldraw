import { FairyProject, StartProjectAction, Streaming } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyAgentById, getFairyNameById } from '../fairy-agent/agent/fairyAgentsAtom'
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

		const thisFairyName = getFairyNameById(this.agent.id, this.editor)
		const thisFairyId = this.agent.id

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

		const memberFairies = action.projectMemberIds
			.map((id) => getFairyAgentById(id, this.editor))
			.filter((fairy) => fairy !== undefined)

		memberFairies.forEach((fairy) => {
			fairy.$currentProjectId.set(projectId)
			fairy.schedule({
				messages: [
					`You are now a member of the project: ${action.projectName}: ${action.projectDescription}. 
					${thisFairyName} (${thisFairyId}) is the orchestrator of the project.`,
					`Navigate to the orchestrator's position to start working on the project.`,
				],
				mode: 'drone',
			})
		})

		this.agent.$currentProjectId.set(projectId)
		this.agent.cancel()
		this.agent.schedule({
			messages: [
				`Started project: ${action.projectName}: ${action.projectDescription}`,
				`Now, assign todos to project members. All todo items will be added to the current project.`,
			],
		})
	}
}
