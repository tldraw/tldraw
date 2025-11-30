import { ClaimTodoItemAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class ClaimTodoItemActionUtil extends AgentActionUtil<ClaimTodoItemAction> {
	static override type = 'claim-todo-item' as const

	override getInfo(action: Streaming<ClaimTodoItemAction>) {
		const text = action.complete
			? `Claimed todo item ${action.todoItemId}.`
			: `Claiming todo item ${action.todoItemId}...`

		return createAgentActionInfo({
			icon: 'pencil',
			description: text,
			pose: 'reading',
		})
	}

	override applyAction(action: Streaming<ClaimTodoItemAction>) {
		if (!action.complete) return
		if (!this.agent || !this.editor) return

		// Todo
	}
}
