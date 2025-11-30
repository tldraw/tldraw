import { EndDuoProjectAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { $fairyAgentsAtom } from '../fairy-globals'
import { deleteProjectAndAssociatedTasks } from '../fairy-projects'
import { getFairyTasksByProjectId } from '../fairy-task-list'
import { AgentActionUtil } from './AgentActionUtil'

export class EndDuoProjectActionUtil extends AgentActionUtil<EndDuoProjectAction> {
	static override type = 'end-duo-project' as const

	override getInfo(action: Streaming<EndDuoProjectAction>) {
		return createAgentActionInfo({
			icon: 'flag',
			description: action.complete ? 'Ended project' : 'Ending project...',
			pose: 'reviewing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<EndDuoProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const project = this.agent.getProject()
		if (!project) {
			this.agent.interrupt({
				input:
					'You are not currently part of a project. You cannot end a project you are not part of.',
			})
			return
		}

		const membersIds = project.members.map((member) => member.id)
		const memberAgents = $fairyAgentsAtom
			.get(this.editor)
			.filter((agent) => membersIds.includes(agent.id))

		const duoOrchestratorAgent = memberAgents.find(
			(agent) => agent.getRole() === 'duo-orchestrator'
		)
		const droneAgent = memberAgents.find((agent) => agent.getRole() === 'drone')

		if (!duoOrchestratorAgent || !droneAgent) {
			deleteProjectAndAssociatedTasks(project.id)
			return
		}

		const completedTasks = getFairyTasksByProjectId(project.id).filter(
			(task) => task.status === 'done'
		)

		// Handle duo-orchestrator
		const duoOrchestratorCompletedTasks = completedTasks.filter(
			(task) => task.assignedTo === duoOrchestratorAgent.id
		)
		const duoOrchestratorTaskCount = duoOrchestratorCompletedTasks.length
		const duoOrchestratorTaskWord = duoOrchestratorTaskCount === 1 ? 'task' : 'tasks'
		duoOrchestratorAgent.chatManager.push(
			{
				id: uniqueId(),
				type: 'memory-transition',
				memoryLevel: 'fairy',
				agentFacingMessage: `[ACTIONS]: <Project actions filtered for brevity>`,
				userFacingMessage: null,
			},
			{
				id: uniqueId(),
				type: 'prompt',
				promptSource: 'self',
				memoryLevel: 'fairy',
				agentFacingMessage: `I led and completed the "${project.title}" project with my partner, ${droneAgent.$fairyConfig.get()?.name}. I completed ${duoOrchestratorTaskCount} ${duoOrchestratorTaskWord} as part of the project.`,
				userFacingMessage: null,
			}
		)
		duoOrchestratorAgent.interrupt({ mode: 'idling', input: null })

		// Handle drone
		const droneCompletedTasks = completedTasks.filter((task) => task.assignedTo === droneAgent.id)
		if (droneCompletedTasks.length > 0) {
			const droneTaskCount = droneCompletedTasks.length
			const droneTaskWord = droneTaskCount === 1 ? 'task' : 'tasks'
			droneAgent.chatManager.push(
				{
					id: uniqueId(),
					type: 'memory-transition',
					memoryLevel: 'fairy',
					agentFacingMessage: `[ACTIONS]: <Project actions filtered for brevity>`,
					userFacingMessage: null,
				},
				{
					id: uniqueId(),
					type: 'prompt',
					promptSource: 'self',
					memoryLevel: 'fairy',
					agentFacingMessage: `I completed ${droneTaskCount} ${droneTaskWord} as part of the "${project.title}" project with my partner, ${duoOrchestratorAgent.$fairyConfig.get()?.name}.`,
					userFacingMessage: `I completed ${droneTaskCount} ${droneTaskWord} as part of the "${project.title}" project.`,
				}
			)
		}
		droneAgent.interrupt({ mode: 'idling', input: null })

		deleteProjectAndAssociatedTasks(project.id)
	}
}
