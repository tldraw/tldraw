import { StartSoloTaskAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class StartSoloTaskActionUtil extends AgentActionUtil<StartSoloTaskAction> {
	static override type = 'start-task' as const

	override getInfo(action: Streaming<StartSoloTaskAction>) {
		const task = action.taskId ? this.agent.fairyApp.tasks.getTaskById(action.taskId) : undefined

		return createAgentActionInfo({
			icon: 'note',
			description: action.complete
				? `Started task${task?.title ? `: ${task.title}` : ''}`
				: 'Starting task...',
			ircMessage: action.complete && task?.title ? `I'm starting on: ${task.title}` : null,
			pose: 'reading',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<StartSoloTaskAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const task = this.agent.fairyApp.tasks.getTaskById(action.taskId)
		if (!task) return

		if (task.assignedTo !== this.agent.id) {
			this.agent.interrupt({
				input: `Task\nID: "${action.taskId}"\nTitle: "${task.title}"\nDescription: "${task.text}" is not assigned to you. Please take another look at the task list and try again.`,
			})
			return
		}

		this.agent.fairyApp.tasks.setTaskStatus(action.taskId, 'in-progress')

		this.agent.interrupt({
			mode: 'working-solo',
			input: {
				agentMessages: [
					`You just decided to start working on a task.\nID: "${task.id}"\nTitle: "${task.title}"\nDescription: "${task.text}".`,
				],
				bounds: {
					x: task.x,
					y: task.y,
					w: task.w,
					h: task.h,
				},
			},
		})
	}
}
