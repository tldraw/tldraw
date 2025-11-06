import { SharedTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class SharedTodoListActionUtil extends AgentActionUtil<SharedTodoListAction> {
	static override type = 'update-todo-list' as const

	override getInfo(action: Streaming<SharedTodoListAction>) {
		return {
			icon: 'pencil' as const,
			description: 'Update todo list',
			summary: action.complete
				? `Updated todo item ${action.id}: "${action.text}", with status "${action.status}"`
				: 'Updating todo list...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<SharedTodoListAction>) {
		if (!action.complete) return
		if (!this.agent) return

		// Todo
	}
}
