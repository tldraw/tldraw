import {
	Streaming,
	UpsertPersonalTodoItemAction,
	createAgentActionInfo,
} from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class UpsertPersonalTodoItemActionUtil extends AgentActionUtil<UpsertPersonalTodoItemAction> {
	static override type = 'upsert-personal-todo-item' as const

	override getInfo(action: Streaming<UpsertPersonalTodoItemAction>) {
		if (!action.complete) {
			return createAgentActionInfo({
				description: null,
				pose: 'writing',
			})
		}

		if (action.status === 'in-progress') {
			return {
				icon: 'note' as const,
				description: action.text,
				pose: 'reviewing' as const,
				canGroup: () => false,
			}
		}

		return {
			description: null,
			pose: 'writing' as const,
		}
	}

	override applyAction(action: Streaming<UpsertPersonalTodoItemAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const { id, text, status } = action

		const index = this.agent.todos.getTodos().findIndex((item) => item.id === id)
		if (index === -1) {
			if (!text) {
				this.agent.interrupt({
					input: 'You must provide text when creating a new todo item.',
				})
				return
			}
			this.agent.todos.push(id, text)
		} else {
			this.agent.todos.update({ id, status, text })
		}
	}
}
