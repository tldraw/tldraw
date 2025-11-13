import { MarkTaskDoneAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getProjectByAgentId, getRoleByAgentId } from '../FairyProjects'
import { $fairyTasks, setFairyTaskStatusAndNotifyCompletion } from '../FairyTaskList'
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

		const task = $fairyTasks.get().find((task) => task.id === action.taskId)
		if (!task) return

		setFairyTaskStatusAndNotifyCompletion(action.taskId, 'done', this.editor)

		const currentBounds = this.agent.$activeRequest.get()?.bounds
		if (!currentBounds) return

		// todo, should this be here? should this logic somehow be in the fairy mode chart?
		if (getProjectByAgentId(this.agent.id)) {
			if (getRoleByAgentId(this.agent.id) === 'orchestrator') {
				this.agent.interrupt({
					setMode: 'orchestrating',
					input: {
						message: `Check that the following task has been completed as reported on the task list: Task ${action.taskId}\nThen, continue monitoring the project.`,
						bounds: {
							x: task.x ?? currentBounds.x,
							y: task.y ?? currentBounds.y,
							w: task.w ?? currentBounds.w,
							h: task.h ?? currentBounds.h,
						},
					},
				})
			} else {
				this.agent.interrupt({ setMode: 'standing-by' })
			}
		} else {
			this.agent.interrupt({
				setMode: 'soloing',
				input: {
					message: `Check that the following task has been completed as reported on the task list: Task ${action.taskId}`,
					bounds: {
						x: task.x ?? currentBounds.x,
						y: task.y ?? currentBounds.y,
						w: task.w ?? currentBounds.w,
						h: task.h ?? currentBounds.h,
					},
				},
			})
		}
	}
}
