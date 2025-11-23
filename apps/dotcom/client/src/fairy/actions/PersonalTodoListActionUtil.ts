import { PersonalTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class PersonalTodoListActionUtil extends AgentActionUtil<PersonalTodoListAction> {
	static override type = 'update-personal-todo-list' as const

	override getInfo(action: Streaming<PersonalTodoListAction>) {
		if (!action.complete) {
			return {
				icon: 'note' as const,
				description: 'Updating personal todo list...',
				pose: 'writing' as const,
			}
		}

		if (action.id) {
			return {
				icon: 'note' as const,
				description: `Updated personal todo item ${action.id} with status "${action.status}"`,
				pose: 'writing' as const,
			}
		} else {
			return {
				icon: 'note' as const,
				description: `Created new personal todo item: "${action.text}"`,
				pose: 'writing' as const,
			}
		}
	}

	override applyAction(action: Streaming<PersonalTodoListAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const { id, text, status } = action

		const index = this.agent.$personalTodoList.get().findIndex((item) => item.id === id)
		if (index === -1) {
			this.agent.addPersonalTodo(id, text)
		} else {
			this.agent.updateTodo({ id, text, status })
		}
	}
}
