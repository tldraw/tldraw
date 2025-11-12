import { AgentRequest, SoloTasksPart } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { $fairyTasks } from '../FairyTaskList'
import { PromptPartUtil } from './PromptPartUtil'

export class SoloTasksPartUtil extends PromptPartUtil<SoloTasksPart> {
	static override type = 'soloTasks' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): SoloTasksPart {
		const allTasks = $fairyTasks.get()
		const tasks = allTasks
			.filter((task) => task.assignedTo === this.agent.id)
			.map((task) => {
				const transformedTaskBounds =
					task.x && task.y && task.w && task.h
						? helpers.applyOffsetToBox({ x: task.x, y: task.y, w: task.w, h: task.h })
						: task.x && task.y
							? helpers.applyOffsetToVec({ x: task.x, y: task.y })
							: { x: task.x, y: task.y, w: task.w, h: task.h }

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
