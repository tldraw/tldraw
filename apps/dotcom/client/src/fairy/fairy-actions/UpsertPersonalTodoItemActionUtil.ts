import { Streaming, UpsertPersonalTodoItemAction } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class UpsertPersonalTodoItemActionUtil extends AgentActionUtil<UpsertPersonalTodoItemAction> {
	static override type = 'upsert-personal-todo-item' as const

	override getInfo(action: Streaming<UpsertPersonalTodoItemAction>) {
		if (!action.complete) {
			return {
				description: null,
				pose: 'writing' as const,
			}
		}

		if (action.status === 'in-progress') {
			return {
				icon: 'note' as const,
				description: action.text,
				pose: 'writing' as const,
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

		const index = this.agent.$personalTodoList.get().findIndex((item) => item.id === id)
		if (index === -1) {
			if (!text) {
				this.agent.interrupt({
					input: 'You must provide text when creating a new todo item.',
				})
				return
			}
			this.agent.addPersonalTodo(id, text)
		} else {
			this.agent.updatePersonalTodo({ id, status, text })
		}
	}
}
