import { AbortProjectAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { AgentActionUtil } from './AgentActionUtil'

export class AbortProjectActionUtil extends AgentActionUtil<AbortProjectAction> {
	static override type = 'abort-project' as const

	override getInfo(action: Streaming<AbortProjectAction>) {
		return createAgentActionInfo({
			icon: 'flag',
			description: action.complete ? null : 'Aborting project...',
			pose: 'reviewing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<AbortProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const project = this.agent.getProject()
		if (!project) {
			this.agent.interrupt({
				input:
					'You are not currently part of a project. You cannot abort a project you are not part of.',
			})
			return
		}

		if (project.title !== '') {
			this.agent.interrupt({
				input: 'You cannot abort projects that have already been started.',
			})
			return
		}

		const membersIds = project.members.map((member) => member.id)
		const memberAgents = this.agent.fairyApp.agents
			.getAgents()
			.filter((agent: FairyAgent) => membersIds.includes(agent.id))

		// Get orchestrator before deleting project
		const orchestratorMember = this.agent.fairyApp.projects.getProjectOrchestrator(project)
		const orchestratorAgent = orchestratorMember
			? this.agent.fairyApp.agents.getAgentById(orchestratorMember.id)
			: null

		memberAgents.forEach((memberAgent: FairyAgent) => {
			const isOrchestrator = orchestratorAgent && memberAgent.id === orchestratorAgent.id
			memberAgent.chat.push({
				id: uniqueId(),
				type: 'memory-transition',
				memoryLevel: 'fairy',
				agentFacingMessage: `Project aborted: ${action.reason}`,
				userFacingMessage: isOrchestrator
					? `I aborted the project because: ${action.reason}`
					: `The project was aborted because: ${action.reason}`,
			})
			memberAgent.interrupt({ mode: 'idling', input: null })
		})

		this.agent.fairyApp.projects.deleteProjectAndAssociatedTasks(project.id)

		// Select orchestrator after deleting project
		if (orchestratorAgent) {
			const allAgents = this.agent.fairyApp.agents.getAgents()
			allAgents.forEach((agent) => {
				const shouldSelect = agent.id === orchestratorAgent.id
				agent.updateEntity((f) => (f ? { ...f, isSelected: shouldSelect } : f))
			})
		}
	}
}
