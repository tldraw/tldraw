import { AssignTodoItemAction, Streaming } from '@tldraw/fairy-shared'
import { $fairyAgentsAtom, getFairyAgentById } from '../fairy-agent/agent/fairyAgentsAtom'
import { $sharedTodoList } from '../SharedTodoList'
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
		if (!this.agent || !this.editor) return

		const { otherFairyId, todoItemId } = action

		const otherFairy = getFairyAgentById(otherFairyId, this.editor)
		if (!otherFairy) {
			this.agent.cancel()
			this.agent.schedule(
				`Fairy with id ${otherFairyId} not found. Maybe there was a typo or they've since left the canvas.`
			)
			return
		}

		const todoItem = $sharedTodoList.get().find((item) => item.id === todoItemId)
		if (!todoItem) {
			this.agent.cancel()
			this.agent.schedule(
				`Todo item with id ${todoItemId} not found. Maybe there was a typo or it's been deleted.`
			)
			return
		}

		// Update the shared todo list with the new assignedById
		$sharedTodoList.update((items) => {
			return items.map((item) =>
				item.id === todoItemId ? { ...item, assignedById: otherFairyId } : item
			)
		})
	}
}
