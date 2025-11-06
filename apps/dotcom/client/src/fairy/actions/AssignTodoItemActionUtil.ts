import { AssignTodoItemAction, Streaming } from '@tldraw/fairy-shared'
import { $fairyAgentsAtom } from '../fairy-agent/agent/fairyAgentsAtom'
import { AgentActionUtil } from './AgentActionUtil'

export class AssignTodoItemActionUtil extends AgentActionUtil<AssignTodoItemAction> {
	static override type = 'assign-todo-item' as const

	override getInfo(action: Streaming<AssignTodoItemAction>) {
		let otherFairyName = 'a fairy'

		if (action.complete) {
			const otherFairy = $fairyAgentsAtom
				.get(this.editor)
				.find((fairy) => fairy.id === action.otherFairyId)
			otherFairyName = otherFairy ? otherFairy.$fairyConfig.get().name : 'a fairy'
		}

		const text = action.complete
			? `Assigned todo item ${action.todoItemId} to ${otherFairyName}.`
			: `Assigning todo item ${action.todoItemId} to ${otherFairyName}...`

		return {
			icon: 'pencil' as const,
			description: text,
		}
	}

	override applyAction(action: Streaming<AssignTodoItemAction>) {
		if (!action.complete) return
		if (!this.agent) return

		// Todo
	}
}
