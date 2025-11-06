import { AgentRequest, SoloTasksPart } from '@tldraw/fairy-shared'
import { $fairyTasks } from '../FairyTaskList'
import { PromptPartUtil } from './PromptPartUtil'

export class SoloTasksPartUtil extends PromptPartUtil<SoloTasksPart> {
	static override type = 'soloTasks' as const

	override getPart(_request: AgentRequest): SoloTasksPart {
		const allTasks = $fairyTasks.get()
		const tasks = allTasks.filter((task) => task.assignedTo === this.agent.id)
		return {
			type: 'soloTasks',
			tasks,
		}
	}
}
