import { MarkTaskDoneAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getProjectByAgentId, getRoleByAgentId } from '../FairyProjects'
import { $fairyTasks } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class MarkTaskDoneActionUtil extends AgentActionUtil<MarkTaskDoneAction> {
	static override type = 'mark-task-done' as const

	override getInfo(action: Streaming<MarkTaskDoneAction>) {
		const task = $fairyTasks.get().find((task) => task.id === action.taskId)

		return {
			icon: 'note' as const,
			description: action.complete
				? `Completed task: ${task?.text ?? action.taskId}`
				: 'Completing task...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<MarkTaskDoneAction>, _helpers: AgentHelpers) {
		if (!action.complete) return
		$fairyTasks.update((tasks) =>
			tasks.map((task) => (task.id === action.taskId ? { ...task, status: 'done' as const } : task))
		)
		const task = $fairyTasks.get().find((task) => task.id === action.taskId)
		if (!task) return
		const currentBounds = this.agent.$activeRequest.get()?.bounds
		if (!currentBounds) return

		this.agent.cancel()
		// todo, should this be here? should this logic somehow be in the fairy mode chart?
		if (getProjectByAgentId(this.agent.id)) {
			if (getRoleByAgentId(this.agent.id) === 'orchestrator') {
				this.agent.setMode('orchestrating')
				this.agent.schedule({
					message: `Check that the following task has been completed as reported on the task list: Task ${action.taskId}\nThen, continue monitoring the project.`,
					bounds: {
						x: task.x ?? currentBounds.x,
						y: task.y ?? currentBounds.y,
						w: task.w ?? currentBounds.w,
						h: task.h ?? currentBounds.h,
					},
				})
			} else {
				this.agent.setMode('standing-by')
			}
		} else {
			this.agent.setMode('soloing')
			this.agent.schedule({
				message: `Check that the following task has been completed as reported on the task list: Task ${action.taskId}`,
				bounds: {
					x: task.x ?? currentBounds.x,
					y: task.y ?? currentBounds.y,
					w: task.w ?? currentBounds.w,
					h: task.h ?? currentBounds.h,
				},
			})
		}
	}
}
