import { MarkSoloTaskDoneAction, Streaming } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { setFairyTaskStatusAndNotifyCompletion } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class MarkSoloTaskDoneActionUtil extends AgentActionUtil<MarkSoloTaskDoneAction> {
	static override type = 'mark-task-done' as const

	override getInfo(_action: Streaming<MarkSoloTaskDoneAction>) {
		return {
			icon: 'flag' as const,
			description: `Completed task`,
			pose: 'writing' as const,
			canGroup: () => false,
		}
	}

	override applyAction(action: Streaming<MarkSoloTaskDoneAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const currentWork = this.agent.getWork()
		const currentTask = currentWork.tasks.find((task) => task.status === 'in-progress')
		if (!currentTask) return // todo error
		const currentTaskId = currentTask.id

		setFairyTaskStatusAndNotifyCompletion(currentTaskId, 'done', this.editor)
		this.agent.$chatHistory.update((prev) => [
			...prev,
			{
				id: uniqueId(),
				type: 'memory-transition',
				memoryLevel: 'fairy',
				message: `I just finished the task.\nID: "${currentTaskId}"\nTitle: "${currentTask.title}"\nDescription: "${currentTask.text}".`,
				userFacingMessage: null,
			},
		])

		const currentBounds = this.agent.$activeRequest.get()?.bounds
		if (!currentBounds) return

		this.agent.interrupt({
			mode: 'soloing',
			input: {
				bounds: {
					x: currentTask.x ?? currentBounds.x,
					y: currentTask.y ?? currentBounds.y,
					w: currentTask.w ?? currentBounds.w,
					h: currentTask.h ?? currentBounds.h,
				},
			},
		})
	}
}
