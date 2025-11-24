import { PersonalTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class PersonalTodoListActionUtil extends AgentActionUtil<PersonalTodoListAction> {
	static override type = 'update-personal-todo-list' as const

	override getInfo(action: Streaming<PersonalTodoListAction>) {
		if (!action.complete) {
			return null
		}

		if (action.status === 'in-progress') {
			return {
				icon: 'note' as const,
				label: 'Started',
				description: action.text,
				pose: 'writing' as const,
				canGroup: () => false,
			}
		}

		if (action.status === 'done') {
			return null
		}

		return null
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
