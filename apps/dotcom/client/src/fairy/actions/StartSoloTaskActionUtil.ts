import { StartSoloTaskAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyTasks } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class StartSoloTaskActionUtil extends AgentActionUtil<StartSoloTaskAction> {
	static override type = 'start-task' as const

	override getInfo(action: Streaming<StartSoloTaskAction>) {
		const task = $fairyTasks.get().find((task) => task.id === action.taskId)

		return {
			icon: 'note' as const,
			description: action.complete
				? `Started task: ${task?.text ?? action.taskId}`
				: 'Starting task...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<StartSoloTaskAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const task = $fairyTasks.get().find((task) => task.id === action.taskId)
		if (!task) return

		if (task.assignedTo !== this.agent.id) {
			this.agent.interrupt({
				input: `Task "${task.text}" with id ${action.taskId} is not assigned to you. Please take another look at the task list and try again.`,
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
			mode: 'working-solo',
			input: {
				messages: [`You have started working on task "${task.text}" with id ${task.id}.`],
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
