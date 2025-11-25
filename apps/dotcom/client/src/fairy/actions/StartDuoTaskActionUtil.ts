import { StartDuoTaskAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyTasks } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class StartDuoTaskActionUtil extends AgentActionUtil<StartDuoTaskAction> {
	static override type = 'start-duo-task' as const

	override getInfo(action: Streaming<StartDuoTaskAction>) {
		const task = $fairyTasks.get().find((task) => task.id === action.taskId)

		return {
			icon: 'note' as const,
			description: action.complete ? `Started task: ${task?.title}` : 'Starting task...',
			pose: 'reading' as const,
			canGroup: () => false,
		}
	}

	override applyAction(action: Streaming<StartDuoTaskAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const task = $fairyTasks.get().find((task) => task.id === action.taskId)
		if (!task) return

		const project = this.agent.getProject()
		if (!project) return

		// In duo mode, the orchestrator can start tasks assigned to themselves or their partner
		if (
			task.assignedTo !== this.agent.id &&
			task.assignedTo !== project.members.find((m) => m.id !== this.agent.id)?.id
		) {
			this.agent.interrupt({
				input: `Task\nID: "${action.taskId}"\nTitle: "${task.title}"\nDescription: "${task.text}" is not assigned to you or your partner. Please take another look at the task list and try again.`,
			})
			return
		}

		// Make sure the task is actually assigned to me
		if (task.assignedTo !== this.agent.id) {
			this.agent.interrupt({
				input: `Task\nID: "${action.taskId}"\nTitle: "${task.title}"\nDescription: "${task.text}" is not assigned to you. Please direct your partner to start the task, or start another task yourself.`,
			})
			return
		}

		$fairyTasks.update((tasks) =>
			tasks.map((task) =>
				task.id === action.taskId ? { ...task, status: 'in-progress' as const } : task
			)
		)

		const currentBounds = this.agent.$activeRequest.get()?.bounds
		if (!currentBounds) return

		this.agent.interrupt({
			mode: 'working-orchestrator',
			input: {
				agentMessages: [
					`You just decided to start working on a task.\nID: "${task.id}"\nTitle: "${task.title}"\nDescription: "${task.text}".`,
				],
				bounds: {
					x: task.x ?? currentBounds.x,
					y: task.y ?? currentBounds.y,
					w: task.w ?? currentBounds.w,
					h: task.h ?? currentBounds.h,
				},
			},
		})
	}
}
