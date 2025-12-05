import {
	DeletePersonalTodoItemsAction,
	Streaming,
	createAgentActionInfo,
} from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class DeletePersonalTodoItemsActionUtil extends AgentActionUtil<DeletePersonalTodoItemsAction> {
	static override type = 'delete-personal-todo-items' as const

	override getInfo(action: Streaming<DeletePersonalTodoItemsAction>) {
		if (!action.complete) {
			return createAgentActionInfo({
				description: null,
				pose: 'writing',
			})
		}

		const count = action.ids.length
		return {
			icon: 'trash' as const,
			description: `Deleted ${count} todo item${count === 1 ? '' : 's'}`,
			pose: 'writing' as const,
		}
	}

	override applyAction(action: Streaming<DeletePersonalTodoItemsAction>) {
		if (!action.complete) return
		if (!this.agent) return

		this.agent.todos.delete(action.ids)
	}
}
