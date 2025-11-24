import { MarkDroneTaskDoneAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyTasks, setFairyTaskStatusAndNotifyCompletion } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class MarkDroneTaskDoneActionUtil extends AgentActionUtil<MarkDroneTaskDoneAction> {
	static override type = 'mark-my-task-done' as const

	override getInfo(action: Streaming<MarkDroneTaskDoneAction>) {
		const task = $fairyTasks.get().find((task) => task.id === action.taskId)

		return {
			icon: 'note' as const,
			description: action.complete
				? `Completed task: ${task?.text ?? action.taskId}`
				: 'Completing task...',
			pose: 'writing' as const,
			canGroup: () => false,
		}
	}

	override applyAction(action: Streaming<MarkDroneTaskDoneAction>, _helpers: AgentHelpers) {
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
		this.agent.interrupt({ mode: 'standing-by', input: null })
	}
}
