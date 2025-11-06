import { CreateTaskAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { createFairyTask } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

export class CreateTaskActionUtil extends AgentActionUtil<CreateTaskAction> {
	static override type = 'create-task' as const

	override getInfo(action: Streaming<CreateTaskAction>) {
		const label = action.complete ? 'Created task' : 'Creating task'
		return {
			icon: 'note' as const,
			description: `${label}: ${action.text}`,
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<CreateTaskAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		createFairyTask({
			text: action.text,
			assignedTo: this.agent.id,
			status: 'todo',
		})
	}
}
