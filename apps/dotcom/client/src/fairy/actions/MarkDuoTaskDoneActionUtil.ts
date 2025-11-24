import { MarkDuoTaskDoneAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyTasks, setFairyTaskStatusAndNotifyCompletion } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class MarkDuoTaskDoneActionUtil extends AgentActionUtil<MarkDuoTaskDoneAction> {
	static override type = 'mark-duo-task-done' as const

	override getInfo(action: Streaming<MarkDuoTaskDoneAction>) {
		const task = $fairyTasks.get().find((task) => task.id === action.taskId)

		return {
			icon: 'note' as const,
			description: action.complete
				? `Completed duo task: ${task?.text ?? action.taskId}`
				: 'Completing duo task...',
			pose: 'writing' as const,
			canGroup: () => false,
		}
	}

	override applyAction(action: Streaming<MarkDuoTaskDoneAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const task = $fairyTasks.get().find((task) => task.id === action.taskId)
		if (!task) return

		setFairyTaskStatusAndNotifyCompletion(action.taskId, 'done', this.editor)
		this.agent.$chatHistory.update((prev) => [
			...prev,
			{
				type: 'memory-transition',
				memoryLevel: 'project',
				message: `I just finished the task.\nID: "${action.taskId}"\nTitle: "${task.title}"\nDescription: "${task.text}".`,
				userFacingMessage: null,
			},
		])

		// Return to duo-orchestrating-active mode after completing a task
		this.agent.interrupt({
			mode: 'duo-orchestrating-active',
			input: null,
		})
	}
}
