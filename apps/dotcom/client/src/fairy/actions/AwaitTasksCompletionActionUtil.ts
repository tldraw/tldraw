import { AwaitTasksCompletionAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyTaskById } from '../FairyTaskList'
import { createTaskWaitCondition } from '../FairyWaitNotifications'
import { AgentActionUtil } from './AgentActionUtil'

export class AwaitTasksCompletionActionUtil extends AgentActionUtil<AwaitTasksCompletionAction> {
	static override type = 'await-tasks-completion' as const

	override getInfo(action: Streaming<AwaitTasksCompletionAction>) {
		const taskCount = action.taskIds?.length ?? 0
		return {
			icon: 'note' as const,
			description: action.complete
				? `Waiting for ${taskCount} task${taskCount === 1 ? '' : 's'} to complete`
				: 'Setting up wait conditions...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<AwaitTasksCompletionAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		const taskIds = action.taskIds ?? []
		if (taskIds.length === 0) {
			return
		}

		// Check if all tasks are real
		const invalidTaskIds: number[] = []
		for (const taskId of taskIds) {
			const task = getFairyTaskById(taskId)
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
			const condition = createTaskWaitCondition(taskId)
			this.agent.waitFor(condition)
		}
		this.agent.cancel()
	}
}
