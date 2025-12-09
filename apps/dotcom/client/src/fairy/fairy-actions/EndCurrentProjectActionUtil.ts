import { EndCurrentProjectAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { FairyAgent } from '../fairy-agent/FairyAgent'
import { AgentActionUtil } from './AgentActionUtil'

export class EndCurrentProjectActionUtil extends AgentActionUtil<EndCurrentProjectAction> {
	static override type = 'end-project' as const

	override getInfo(action: Streaming<EndCurrentProjectAction>) {
		return createAgentActionInfo({
			icon: 'flag',
			description: action.complete ? 'Ended project' : 'Ending project...',
			ircMessage: action.complete ? `I ended the project.` : null,
			pose: 'reviewing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<EndCurrentProjectAction>, _helpers: AgentHelpers) {
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
		const memberAgents = this.agent.fairyApp.agents
			.getAgents()
			.filter((agent: FairyAgent) => membersIds.includes(agent.id))

		const completedTasks = this.agent.fairyApp.tasks
			.getTasksByProjectId(project.id)
			.filter((task) => task.status === 'done')

		memberAgents.forEach((memberAgent: FairyAgent) => {
			const otherMemberIds = memberAgents
				.map((agent: FairyAgent) => agent.id)
				.filter((id: string) => id !== memberAgent.id)

			if (memberAgent.id === this.agent.id) {
				memberAgent.chat.push(
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
						agentFacingMessage: `I led and completed the "${project.title}" project with ${otherMemberIds.length} other fairy(s): ${otherMemberIds.join(', ')}`,
						userFacingMessage: null,
					}
				)
			}

			const memberCompletedTasks = completedTasks.filter(
				(task) => task.assignedTo === memberAgent.id
			)
			if (memberCompletedTasks.length > 0) {
				const count = memberCompletedTasks.length
				const taskWord = count === 1 ? 'task' : 'tasks'
				memberAgent.chat.push(
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
						agentFacingMessage: `I completed ${count} ${taskWord} as part of the "${project.title}" project, with ${otherMemberIds.length} other fairy(s): ${otherMemberIds.join(', ')}`,
						userFacingMessage: `I completed ${count} ${taskWord} as part of the "${project.title}" project.`,
					}
				)
			}
			memberAgent.interrupt({ mode: 'idling', input: null })
		})

		// If feed dialog is open, soft delete instead of hard delete
		if (this.agent.fairyApp.getIsFeedDialogOpen()) {
			this.agent.fairyApp.projects.softDeleteProjectAndAssociatedTasks(project.id)
		} else {
			this.agent.fairyApp.projects.deleteProjectAndAssociatedTasks(project.id)
		}

		// Select orchestrator after project deletion
		const allAgents = this.agent.fairyApp.agents.getAgents()
		allAgents.forEach((agent) => {
			const shouldSelect = agent.id === this.agent.id
			agent.updateEntity((f) => (f ? { ...f, isSelected: shouldSelect } : f))
		})
	}
}
