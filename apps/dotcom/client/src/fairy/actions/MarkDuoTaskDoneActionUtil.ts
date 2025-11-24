import { MarkDuoTaskDoneAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { setFairyTaskStatusAndNotifyCompletion } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class MarkDuoTaskDoneActionUtil extends AgentActionUtil<MarkDuoTaskDoneAction> {
	static override type = 'mark-duo-task-done' as const

	override getInfo(action: Streaming<MarkDuoTaskDoneAction>) {
		return {
			icon: 'note' as const,
			description: action.complete ? `Completed task` : 'Completing task...',
			pose: 'writing' as const,
			canGroup: () => false,
		}
	}

	override applyAction(action: Streaming<MarkDuoTaskDoneAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const currentWork = this.agent.getWork()
		const currentTask = currentWork.tasks.find((task) => task.status === 'in-progress')
		if (!currentTask) return // todo error
		const currentTaskId = currentTask.id

		setFairyTaskStatusAndNotifyCompletion(currentTaskId, 'done', this.editor)
		this.agent.$chatHistory.update((prev) => [
			...prev,
			{
				type: 'memory-transition',
				memoryLevel: 'project',
				message: `I just finished the task.\nID: "${currentTaskId}"\nTitle: "${currentTask.title}"\nDescription: "${currentTask.text}".`,
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
