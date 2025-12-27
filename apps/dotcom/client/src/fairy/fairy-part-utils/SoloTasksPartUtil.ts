import { AgentRequest, FairyTask, SoloTasksPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class SoloTasksPartUtil extends PromptPartUtil<SoloTasksPart> {
	static override type = 'soloTasks' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): SoloTasksPart {
		const allTasks = this.agent.fairyApp.tasks.getTasks()
		const tasks = allTasks
			.filter((task: FairyTask) => task.assignedTo === this.agent.id)
			.filter((task: FairyTask) => task.projectId === null) // should never happen
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
			type: 'soloTasks',
			tasks,
		}
	}
}
