import { AgentRequest, WorkingTasksPart } from '@tldraw/fairy-shared'
import { $fairyTasks } from '../FairyTaskList'
import { PromptPartUtil } from './PromptPartUtil'

export class WorkingTasksPartUtil extends PromptPartUtil<WorkingTasksPart> {
	static override type = 'workingTasks' as const

	override getPart(_request: AgentRequest): WorkingTasksPart {
		const allTasks = $fairyTasks.get()
		const tasks = allTasks.filter(
			(task) => task.assignedTo === this.agent.id && task.status === 'in-progress'
		)
		return {
			type: 'workingTasks',
			tasks,
		}
	}
}
