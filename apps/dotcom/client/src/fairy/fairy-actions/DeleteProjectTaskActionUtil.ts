import { DeleteProjectTaskAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class DeleteProjectTaskActionUtil extends AgentActionUtil<DeleteProjectTaskAction> {
	static override type = 'delete-project-task' as const

	override getInfo(action: Streaming<DeleteProjectTaskAction>) {
		const task = action.taskId ? this.agent.fairyApp.tasks.getTaskById(action.taskId) : null
		const taskName = task?.title || action.taskId || 'task'
		return createAgentActionInfo({
			icon: 'trash',
			description: action.complete
				? `Removed task: ${taskName}${action.reason ? ` (${action.reason})` : ''}`
				: `Removing task${taskName ? `: ${taskName}` : ''}...`,
			pose: 'writing',
		})
	}

	override applyAction(action: Streaming<DeleteProjectTaskAction>) {
		if (!action.complete) return

		const project = this.agent.getProject()
		if (!project) return

		const task = this.agent.fairyApp.tasks.getTaskById(action.taskId)
		if (!task) {
			this.agent.interrupt({
				input: `Task ${action.taskId} not found. Please take another look at the task list and try again.`,
			})
			return
		}

		// Only delete tasks from the current project
		if (task.projectId !== project.id) {
			this.agent.interrupt({
				input: `Task ${action.taskId} is not part of your current project.`,
			})
			return
		}

		this.agent.fairyApp.tasks.deleteTask(action.taskId)
	}
}
