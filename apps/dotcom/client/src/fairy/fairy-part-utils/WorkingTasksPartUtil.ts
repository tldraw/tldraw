import { AgentRequest, WorkingTasksPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { $fairyTasks } from '../fairy-globals'
import { PromptPartUtil } from './PromptPartUtil'

export class WorkingTasksPartUtil extends PromptPartUtil<WorkingTasksPart> {
	static override type = 'workingTasks' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): WorkingTasksPart {
		const allTasks = $fairyTasks.get()
		const tasks = allTasks
			.filter((task) => task.assignedTo === this.agent.id && task.status === 'in-progress')
			.map((task) => {
				const transformedTaskBounds =
					task.x !== undefined &&
					task.y !== undefined &&
					task.w !== undefined &&
					task.h !== undefined
						? helpers.applyOffsetToBox({ x: task.x, y: task.y, w: task.w, h: task.h })
						: task.x !== undefined && task.y !== undefined
							? helpers.applyOffsetToVec({ x: task.x, y: task.y })
							: { x: task.x, y: task.y, w: task.w, h: task.h }

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
