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
			? `Asked ${otherFairyName} for help.`
			: `Asking ${otherFairyName} for help...`

		return {
			icon: 'pencil' as const,
			description: text,
		}
	}

	override applyAction(action: Streaming<AssignTodoItemAction>) {
		if (!action.complete) return
		if (!this.agent || !this.editor) return

		const { otherFairyId, todoItemIds } = action

		const otherFairy = getFairyAgentById(otherFairyId, this.editor)
		if (!otherFairy) {
			this.agent.cancel()
			this.agent.schedule(
				`Fairy with id ${otherFairyId} not found. Maybe there was a typo or they've since left the canvas.`
			)
			return
		}
		const todoItems = $sharedTodoList.get().filter((item) => todoItemIds.includes(item.id))

		const todoIdsThatDontExist = todoItemIds.filter(
			(id) => !todoItems.some((item) => item.id === id)
		)
		const todoIdsThatAreAlreadyClaimed = todoItems
			.filter((item) => item.claimedById !== undefined && item.claimedById !== '')
			.map((item) => item.id)

		if (todoIdsThatDontExist.length > 0) {
			this.agent.cancel()
			this.agent.schedule(
				`Todo item(s) with id(s) ${todoIdsThatDontExist.join(', ')} not found. Maybe there was a typo or they've been deleted.`
			)
			return
		}

		if (todoIdsThatAreAlreadyClaimed.length > 0) {
			const claimedByNames = todoItems
				.filter((item) => todoIdsThatAreAlreadyClaimed.includes(item.id))
				.map((item) => {
					const claimingAgent = getFairyAgentById(item.claimedById || '', this.editor)
					return claimingAgent
						? claimingAgent.$fairyConfig.get().name
						: `fairy with id ${item.claimedById}`
				})
			this.agent.cancel()
			this.agent.schedule(
				`Todo item(s) with id(s) ${todoIdsThatAreAlreadyClaimed.join(', ')} are already claimed by ${claimedByNames.join(', ')}.`
			)
			return
		}

		const validTodoItems = todoItems.filter(
			(item) =>
				!todoIdsThatAreAlreadyClaimed.includes(item.id) && !todoIdsThatDontExist.includes(item.id)
		)

		if (validTodoItems.length === 0) return

		// Update the shared todo list with the new claimedById
		$sharedTodoList.update((sharedTodoItems) => {
			return sharedTodoItems.map((item) => {
				if (validTodoItems.some((validItem) => validItem.id === item.id)) {
					return { ...item, claimedById: otherFairyId }
				}
				return item
			})
		})

		// Get updated items for helpOut
		const updatedItems = $sharedTodoList
			.get()
			.filter((item) => validTodoItems.some((validItem) => validItem.id === item.id))

		otherFairy.helpOut(updatedItems)
	}
}
