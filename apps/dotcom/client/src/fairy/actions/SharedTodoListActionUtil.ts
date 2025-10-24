import { SharedTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { $sharedTodoList } from '../SharedTodoList'
import { AgentActionUtil } from './AgentActionUtil'

export class SharedTodoListActionUtil extends AgentActionUtil<SharedTodoListAction> {
	static override type = 'update-shared-todo-list' as const

	override getInfo(action: Streaming<SharedTodoListAction>) {
		return {
			icon: 'pencil' as const,
			description: 'Update shared todo list',
			summary: action.complete
				? `Updated shared todo item ${action.id}: "${action.text}", with status "${action.status}", ${action.claimedBy ? `claimed by ${action.claimedBy}` : ''}`
				: 'Updating shared todo list...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<SharedTodoListAction>) {
		if (!action.complete) return
		if (!this.agent) return

		const proposedTodoItem = {
			id: action.id,
			status: action.status,
			text: action.text,
			claimedBy: action.claimedBy,
		}

		const fairyName = this.agent.$fairyConfig.get().name
		const sharedTodoList = $sharedTodoList.get()
		const itemToUpdate = sharedTodoList.find((item) => item.id === proposedTodoItem.id)

		// Check for claiming conflicts
		if (itemToUpdate) {
			const fairyIsClaimingItem = proposedTodoItem.claimedBy === fairyName
			const claimedByAnotherFairy =
				itemToUpdate.claimedBy !== '' && itemToUpdate.claimedBy !== fairyName

			// TODO improve this logic: it shouldnt say none are left if this fairy has some items calimed already.

			if (fairyIsClaimingItem && claimedByAnotherFairy) {
				this.agent.cancel()
				const unclaimedTodoItems = sharedTodoList.filter((item) => !item.claimedBy)
				const todoItemsClaimedByThisFairy = sharedTodoList.filter(
					(item) => item.claimedBy === fairyName
				)

				let message = `I'm sorry, but ${itemToUpdate.claimedBy} has already claimed this todo item with id ${itemToUpdate.id}. `
				if (unclaimedTodoItems.length === 0 && todoItemsClaimedByThisFairy.length === 0) {
					message += 'There are no unclaimed todo items remaining. You can stop working.'
				} else {
					message += `Please try to claim another todo item${todoItemsClaimedByThisFairy.length > 0 ? ` or work on one of your already claimed items` : ''}. Current shared todo list: ${JSON.stringify(sharedTodoList)}`
				}
				this.agent.prompt({ messages: [message], type: 'schedule' })
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
