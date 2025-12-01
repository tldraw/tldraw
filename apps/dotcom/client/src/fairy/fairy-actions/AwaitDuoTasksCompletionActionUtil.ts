import {
	AwaitDuoTasksCompletionAction,
	Streaming,
	createAgentActionInfo,
} from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class AwaitDuoTasksCompletionActionUtil extends AgentActionUtil<AwaitDuoTasksCompletionAction> {
	static override type = 'await-duo-tasks-completion' as const

	override getInfo(action: Streaming<AwaitDuoTasksCompletionAction>) {
		const taskCount = action.taskIds?.length ?? 0
		return createAgentActionInfo({
			icon: 'refresh',
			description: action.complete
				? `Waiting for ${taskCount} task${taskCount === 1 ? '' : 's'} to complete`
				: 'Waiting...',
			pose: 'reviewing',
			canGroup: () => false,
		})
	}

	override applyAction(action: Streaming<AwaitDuoTasksCompletionAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const taskIds = action.taskIds ?? []
		if (taskIds.length === 0) {
			return
		}

		// Check if all tasks are real
		const invalidTaskIds: string[] = []
		for (const taskId of taskIds) {
			const task = this.agent.fairyApp.tasks.getTaskById(taskId)
			if (!task || task.status === 'done') {
				// todo, should we check if task is in project?
				invalidTaskIds.push(taskId)
			}
		}

		// If any tasks are invalid, interrupt the agent
		if (invalidTaskIds.length > 0) {
			const invalidIdsList = invalidTaskIds.join(', ')
			this.agent.interrupt({
				input: `The following task IDs do not exist or are already completed: ${invalidIdsList}. No tasks have been awaited. Please check the task list and try again.`,
			})
			return
		}

		// Create a wait condition for each task ID
		for (const taskId of taskIds) {
			const condition = this.agent.fairyApp.waits.createTaskWaitCondition(taskId)
			this.agent.waits.waitFor(condition)
		}
	}
}
