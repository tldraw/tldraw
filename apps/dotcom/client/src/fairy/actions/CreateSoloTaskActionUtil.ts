import { CreateTaskAction as CreateSoloTaskAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { createFairyTask } from '../FairyTaskList'
import { AgentActionUtil } from './AgentActionUtil'

// Creates a task for themselves
export class CreateSoloTaskActionUtil extends AgentActionUtil<CreateSoloTaskAction> {
	static override type = 'create-solo-task' as const

	override getInfo(action: Streaming<CreateSoloTaskAction>) {
		const label = action.complete ? 'Created task' : 'Creating task'
		return {
			icon: 'note' as const,
			description: `${label}: ${action.text}`,
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<CreateSoloTaskAction>, _helpers: AgentHelpers) {
		if (!action.complete) return

		createFairyTask({
			text: action.text,
			assignedTo: this.agent.id,
			status: 'todo',
			x: action.x,
			y: action.y,
			w: action.w,
			h: action.h,
		})
	}
}
