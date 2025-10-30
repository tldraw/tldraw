import { SharedTodoItem, SharedTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { $sharedTodoList } from '../SharedTodoList'
import { AgentActionUtil } from './AgentActionUtil'

export class SharedTodoListActionUtil extends AgentActionUtil<SharedTodoListAction> {
	static override type = 'update-todo-list' as const

	override getInfo(action: Streaming<SharedTodoListAction>) {
		return {
			icon: 'pencil' as const,
			description: 'Update todo list',
			summary: action.complete
				? `Updated todo item ${action.id}: "${action.text}", with status "${action.status}", ${action.claimedById ? `claimed by ${action.claimedById}` : ''}`
				: 'Updating todo list...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<SharedTodoListAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const proposedTodoItem: SharedTodoItem = {
			id: action.id,
			status: action.status,
			text: action.text,
			claimedById: action.claimedById,
			x: action.x,
			y: action.y,
		}

		const fairyId = this.agent.id
		const sharedTodoList = $sharedTodoList.get()
		const itemToUpdate = sharedTodoList.find((item) => item.id === proposedTodoItem.id)

		// Check for claiming conflicts
		if (itemToUpdate) {
			const fairyIsClaimingItem = proposedTodoItem.claimedById === fairyId
			const claimedByAnotherFairy =
				itemToUpdate.claimedById !== undefined && itemToUpdate.claimedById !== fairyId

			// TODO improve this logic: it shouldnt say none are left if this fairy has some items calimed already.

			if (fairyIsClaimingItem && claimedByAnotherFairy && itemToUpdate.claimedById) {
				this.agent.cancel()
				const unclaimedTodoItems = sharedTodoList.filter((item) => !item.claimedById)
				const todoItemsClaimedByThisFairy = sharedTodoList.filter(
					(item) => item.claimedById === fairyId
				)

				// For now, just use the ID since we don't have easy access to agent names here
				let message = `I'm sorry, but fairy with id ${itemToUpdate.claimedById} has already claimed this todo item with id ${itemToUpdate.id}. `
				if (unclaimedTodoItems.length === 0 && todoItemsClaimedByThisFairy.length === 0) {
					message += 'There are no unclaimed todo items remaining. You can stop working.'
				} else {
					message += `Please try to claim another todo item${todoItemsClaimedByThisFairy.length > 0 ? ` or work on one of your already claimed items` : ''}. Current shared todo list: ${JSON.stringify(sharedTodoList)}`
				}
				this.agent.schedule({ messages: [message] })
				return
			}
		}

		// Update or add the item
		$sharedTodoList.update((sharedTodoItems) => {
			const index = sharedTodoItems.findIndex((item) => item.id === action.id)
			if (index !== -1) {
				return [
					...sharedTodoItems.slice(0, index),
					proposedTodoItem,
					...sharedTodoItems.slice(index + 1),
				]
			} else {
				return [...sharedTodoItems, proposedTodoItem]
			}
		})
	}
}
