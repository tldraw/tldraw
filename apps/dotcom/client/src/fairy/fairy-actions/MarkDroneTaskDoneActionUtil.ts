import { MarkDroneTaskDoneAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class MarkDroneTaskDoneActionUtil extends AgentActionUtil<MarkDroneTaskDoneAction> {
	static override type = 'mark-my-task-done' as const

	override getInfo(action: Streaming<MarkDroneTaskDoneAction>) {
		return createAgentActionInfo({
			icon: 'note',
			description: action.complete ? `Completed task` : 'Completing task...',
			pose: 'writing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<MarkDroneTaskDoneAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const currentWork = this.agent.getWork()
		const currentTask = currentWork.tasks.find((task) => task.status === 'in-progress')
		if (!currentTask) {
			this.agent.interrupt({
				input:
					'You are not currently working on any task. You can only mark a task as done if you are actively working on it.',
			})
			return
		}
		const currentTaskId = currentTask.id

		this.agent.fairyApp.tasks.setTaskStatusAndNotify(currentTaskId, 'done')
		this.agent.chat.push(
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
