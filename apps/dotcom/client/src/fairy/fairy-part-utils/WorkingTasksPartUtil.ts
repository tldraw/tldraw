import { AgentRequest, FairyTask, WorkingTasksPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class WorkingTasksPartUtil extends PromptPartUtil<WorkingTasksPart> {
	static override type = 'workingTasks' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): WorkingTasksPart {
		const allTasks = this.agent.fairyApp.tasks.getTasks()
		const tasks = allTasks
			.filter(
				(task: FairyTask) => task.assignedTo === this.agent.id && task.status === 'in-progress'
			)
			.map((task: FairyTask) => {
				const transformedTaskBounds = helpers.applyOffsetToBox({
					x: task.x,
					y: task.y,
					w: task.w,
					h: task.h,
				})

				return {
					...task,
					...transformedTaskBounds,
				}
			})
		return {
			type: 'workingTasks',
			tasks,
		}
	}
}
