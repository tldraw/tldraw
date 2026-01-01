import { MarkSoloTaskDoneAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class MarkSoloTaskDoneActionUtil extends AgentActionUtil<MarkSoloTaskDoneAction> {
	static override type = 'mark-task-done' as const

	override getInfo(action: Streaming<MarkSoloTaskDoneAction>) {
		// Look for in-progress task first, then fall back to most recent done task
		// (getInfo may be called after applyAction has already marked the task done)
		const currentWork = this.agent.getWork()
		const currentTask =
			currentWork.tasks.find((task) => task.status === 'in-progress') ??
			currentWork.tasks.find((task) => task.status === 'done')
		const taskTitle = currentTask?.title
		return createAgentActionInfo({
			icon: 'note',
			description: action.complete ? `Completed task` : 'Completing task...',
			ircMessage: action.complete ? `I completed the task: ${taskTitle}` : null,
			pose: 'writing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<MarkSoloTaskDoneAction>, _helpers: AgentHelpers) {
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
				memoryLevel: 'fairy',
				agentFacingMessage: `[ACTIONS]: <Task actions filtered for brevity>`,
				userFacingMessage: null,
			},
			{
				id: uniqueId(),
				type: 'prompt',
				promptSource: 'self',
				memoryLevel: 'fairy',
				agentFacingMessage: `I just finished the task.\nID: "${currentTaskId}"\nTitle: "${currentTask.title}"\nDescription: "${currentTask.text}".`,
				userFacingMessage: null,
			}
		)

		const currentBounds = this.agent.requests.getActiveRequest()?.bounds
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
