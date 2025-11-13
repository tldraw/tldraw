import { ClaimTodoItemAction, Streaming } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class ClaimTodoItemActionUtil extends AgentActionUtil<ClaimTodoItemAction> {
	static override type = 'claim-todo-item' as const

	override getInfo(action: Streaming<ClaimTodoItemAction>) {
		const text = action.complete
			? `Claimed todo item ${action.todoItemId}.`
			: `Claiming todo item ${action.todoItemId}...`

		return {
			icon: 'pencil' as const,
			description: text,
		}
	}

	override applyAction(action: Streaming<ClaimTodoItemAction>) {
		if (!action.complete) return
		if (!this.agent || !this.editor) return

		// Todo
	}
}
