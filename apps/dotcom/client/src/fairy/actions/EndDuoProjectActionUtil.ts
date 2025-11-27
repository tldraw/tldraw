import { EndDuoProjectAction, Streaming } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { deleteProject } from '../FairyProjects'
import { getFairyTasksByProjectId } from '../FairyTaskList'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { AgentActionUtil } from './AgentActionUtil'

export class EndDuoProjectActionUtil extends AgentActionUtil<EndDuoProjectAction> {
	static override type = 'end-duo-project' as const

	override getInfo(action: Streaming<EndDuoProjectAction>) {
		return {
			icon: 'flag' as const,
			description: action.complete ? 'Ended project' : 'Ending project...',
			pose: 'writing' as const,
			canGroup: () => false,
		}
	}

	override applyAction(action: Streaming<EndDuoProjectAction>, _helpers: AgentHelpers) {
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
			if (memberAgent.id === this.agent.id) {
				const count = completedTasks.length
				const taskWord = count === 1 ? 'task' : 'tasks'
				memberAgent.$chatHistory.update((prev) => [
					...prev,
					{
						id: uniqueId(),
						type: 'memory-transition',
						memoryLevel: 'fairy',
						message: `I completed ${count} ${taskWord} as part of the "${project.title}" project with my partner.`,
						userFacingMessage: null,
					},
				])
			} else {
				// The partner
				const partnerCompletedTasks = completedTasks.filter(
					(task) => task.assignedTo === memberAgent.id
				)
				if (partnerCompletedTasks.length > 0) {
					const count = partnerCompletedTasks.length
					const taskWord = count === 1 ? 'task' : 'tasks'
					memberAgent.$chatHistory.update((prev) => [
						...prev,
						{
							id: uniqueId(),
							type: 'memory-transition',
							memoryLevel: 'fairy',
							message: `I completed ${count} ${taskWord} as part of the "${project.title}" project with my partner.`,
							userFacingMessage: `I completed ${count} ${taskWord} as part of the "${project.title}" project.`,
						},
					])
				}
			}
			memberAgent.interrupt({ mode: 'idling', input: null })
		})

		deleteProject(project.id)
	}
}
