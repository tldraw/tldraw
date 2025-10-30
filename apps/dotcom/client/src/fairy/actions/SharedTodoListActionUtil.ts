import { SharedTodoItem, SharedTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { $sharedTodoList } from '../SharedTodoList'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyAgentById } from '../fairy-agent/agent/fairyAgentsAtom'
import { AgentActionUtil } from './AgentActionUtil'

export class SharedTodoListActionUtil extends AgentActionUtil<SharedTodoListAction> {
	static override type = 'update-todo-list' as const

	override getInfo(action: Streaming<SharedTodoListAction>) {
		let claimedByName = ''
		if (action.complete && action.claimedById) {
			const claimingAgent = getFairyAgentById(action.claimedById, this.editor)
			claimedByName = claimingAgent
				? claimingAgent.$fairyConfig.get().name
				: `fairy with id ${action.claimedById}`
		}

		return {
			icon: 'pencil' as const,
			description: 'Update todo list',
			summary: action.complete
				? `Updated todo item ${action.id}: "${action.text}", with status "${action.status}", ${claimedByName ? `claimed by ${claimedByName}` : ''}`
				: 'Updating todo list...',
			pose: 'thinking' as const,
		}
	}

	override applyAction(action: Streaming<SharedTodoListAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		// Remove the offset from coordinates, and only include x and y if they are defined
		const coords =
			action.x !== undefined && action.y !== undefined
				? helpers.removeOffsetFromVec({ x: action.x, y: action.y })
				: undefined

		const proposedTodoItem: SharedTodoItem = {
			id: action.id,
			status: action.status,
			text: action.text,
			claimedById: action.claimedById,
			...(coords ? { x: coords.x, y: coords.y } : {}),
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
