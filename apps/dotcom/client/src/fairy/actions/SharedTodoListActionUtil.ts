import { SharedTodoItem, SharedTodoListAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { getFairyAgentById } from '../fairy-agent/agent/fairyAgentsAtom'
import { getProjectById } from '../Projects'
import { $sharedTodoList } from '../SharedTodoList'
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

		const fairyId = this.agent.id
		const currentProjectId = this.agent.$currentProjectId.get()

		const proposedTodoItem: SharedTodoItem = {
			id: action.id,
			status: action.status,
			text: action.text,
			claimedById: action.claimedById,
			projectId: currentProjectId || undefined,
			...(coords ? { x: coords.x, y: coords.y } : {}),
		}

		// If agent is in a project, handle todos through the project
		if (currentProjectId) {
			const project = getProjectById(currentProjectId)
			if (!project) {
				// Project not found, clear the project ID and fall through to shared list
				this.agent.$currentProjectId.set(null)
			} else {
				// Get todos from the shared list that belong to this project
				const projectTodoItems = $sharedTodoList
					.get()
					.filter((item) => item.projectId === currentProjectId)
				const projectTodoItem = projectTodoItems.find((item) => item.id === proposedTodoItem.id)

				// If updating an existing todo, check if it belongs to the project
				if (projectTodoItem) {
					// Check for claiming conflicts
					const fairyIsClaimingItem = proposedTodoItem.claimedById === fairyId
					const claimedByAnotherFairy =
						projectTodoItem.claimedById !== undefined && projectTodoItem.claimedById !== fairyId

					if (fairyIsClaimingItem && claimedByAnotherFairy && projectTodoItem.claimedById) {
						this.agent.cancel()
						const unclaimedTodoItems = projectTodoItems.filter((item) => !item.claimedById)
						const todoItemsClaimedByThisFairy = projectTodoItems.filter(
							(item) => item.claimedById === fairyId
						)

						let message = `I'm sorry, but fairy with id ${projectTodoItem.claimedById} has already claimed this todo item with id ${projectTodoItem.id}. `
						if (unclaimedTodoItems.length === 0 && todoItemsClaimedByThisFairy.length === 0) {
							message +=
								'There are no unclaimed todo items remaining in the project. You can stop working.'
						} else {
							message += `Please try to claim another todo item from your current project${todoItemsClaimedByThisFairy.length > 0 ? ` or work on one of your already claimed items` : ''}.`
						}
						this.agent.schedule({ messages: [message] })
						return
					}

					// Update the todo item in the shared list
					$sharedTodoList.update((sharedTodoItems) => {
						return sharedTodoItems.map((item) =>
							item.id === proposedTodoItem.id ? proposedTodoItem : item
						)
					})
					return
				}

				// If creating a new todo item, add it to the shared list with projectId
				// But first check if it exists in the shared list with a different project or no project
				const sharedTodoItem = $sharedTodoList.get().find((item) => item.id === proposedTodoItem.id)
				if (sharedTodoItem) {
					// Todo exists but doesn't belong to this project - warn the agent
					if (sharedTodoItem.projectId !== currentProjectId) {
						this.agent.cancel()
						this.agent.schedule({
							messages: [
								`You are currently working on project "${project.name}". You can only edit todo items that belong to this project. The todo item with id ${proposedTodoItem.id} is not part of your current project. Please only claim and update todos from your current project.`,
							],
						})
						return
					}
				}

				// Add new todo to the shared list with projectId
				$sharedTodoList.update((sharedTodoItems) => {
					const index = sharedTodoItems.findIndex((item) => item.id === proposedTodoItem.id)
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
				return
			}
		}

		// Agent is not in a project, use the shared todo list
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

		// Update or add the item to shared list
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
