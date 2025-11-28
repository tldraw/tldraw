import { MarkDroneTaskDoneAction, Streaming } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { setFairyTaskStatusAndNotifyCompletion } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class MarkDroneTaskDoneActionUtil extends AgentActionUtil<MarkDroneTaskDoneAction> {
	static override type = 'mark-my-task-done' as const

	override getInfo(action: Streaming<MarkDroneTaskDoneAction>) {
		return {
			icon: 'note' as const,
			description: action.complete ? `Completed task` : 'Completing task...',
			pose: 'writing' as const,
			canGroup: () => false,
		}
	}

	override applyAction(action: Streaming<MarkDroneTaskDoneAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const currentWork = this.agent.getWork()
		const currentTask = currentWork.tasks.find((task) => task.status === 'in-progress')
		if (!currentTask) return // todo error
		const currentTaskId = currentTask.id

		setFairyTaskStatusAndNotifyCompletion(currentTaskId, 'done', this.editor)
		this.agent.pushToChatHistory(
			{
				id: uniqueId(),
				type: 'memory-transition',
				memoryLevel: 'project',
				agentFacingMessage: `[ACTIONS]: <Task actions filtered for brevity>`,
				userFacingMessage: null,
			},
			{
				id: uniqueId(),
				type: 'prompt',
				promptSource: 'self',
				memoryLevel: 'project',
				agentFacingMessage: `I just finished the task.\nID: "${currentTaskId}"\nTitle: "${currentTask.title}"\nDescription: "${currentTask.text}".`,
				userFacingMessage: null,
			}
		)
		this.agent.interrupt({ mode: 'standing-by', input: null })
	}
}
