import { EndCurrentProjectAction, Streaming } from '@tldraw/fairy-shared'
import { deleteProjectAndAssociatedTasks } from '../FairyProjects'
import { getFairyTasksByProjectId } from '../FairyTaskList'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { AgentActionUtil } from './AgentActionUtil'

export class EndCurrentProjectActionUtil extends AgentActionUtil<EndCurrentProjectAction> {
	static override type = 'end-project' as const

	override getInfo(action: Streaming<EndCurrentProjectAction>) {
		return {
			icon: 'flag' as const,
			description: action.complete ? 'Ended project' : 'Ending project...',
			pose: 'writing' as const,
			canGroup: () => false,
		}
	}

	override applyAction(action: Streaming<EndCurrentProjectAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const project = this.agent.getProject()
		if (!project) return // todo error

		const membersIds = project.members.map((member) => member.id)
		const memberAgents = $fairyAgentsAtom
			.get(this.editor)
			.filter((agent) => membersIds.includes(agent.id))

		const completedTasks = getFairyTasksByProjectId(project.id).filter(
			(task) => task.status === 'done'
		)

		memberAgents.forEach((memberAgent) => {
			const otherMemberIds = memberAgents
				.map((agent) => agent.id)
				.filter((id) => id !== memberAgent.id)

			if (memberAgent.id === this.agent.id) {
				memberAgent.$chatHistory.update((prev) => [
					...prev,
					{
						type: 'memory-transition',
						memoryLevel: 'fairy',
						agentFacingMessage: `I led and completed the "${project.title}" project with ${otherMemberIds.length} other fairy(s): ${otherMemberIds.join(', ')}`,
						userFacingMessage: null,
					},
				])
			}

			const memberCompletedTasks = completedTasks.filter(
				(task) => task.assignedTo === memberAgent.id
			)
			if (memberCompletedTasks.length > 0) {
				const count = memberCompletedTasks.length
				const taskWord = count === 1 ? 'task' : 'tasks'
				memberAgent.$chatHistory.update((prev) => [
					...prev,
					{
						type: 'memory-transition',
						memoryLevel: 'fairy',
						agentFacingMessage: `I completed ${count} ${taskWord} as part of the "${project.title}" project, with ${otherMemberIds.length} other fairy(s): ${otherMemberIds.join(', ')}`,
						userFacingMessage: `I completed ${count} ${taskWord} as part of the "${project.title}" project.`,
					},
				])
			}
			memberAgent.interrupt({ mode: 'idling', input: null })
		})

		deleteProjectAndAssociatedTasks(project.id)
	}
}
