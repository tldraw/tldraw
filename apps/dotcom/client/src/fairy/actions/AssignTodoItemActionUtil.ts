import { AssignTodoItemAction, Streaming } from '@tldraw/fairy-shared'
import { $fairyAgentsAtom, getFairyAgentById } from '../fairy-agent/agent/fairyAgentsAtom'
import { getProjectById } from '../Projects'
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

		const currentProjectId = this.agent.$currentProjectId.get()

		// If agent is in a project, handle through the project
		if (currentProjectId) {
			const project = getProjectById(currentProjectId)
			if (!project) {
				// Project not found, clear the project ID and fall through to shared list
				this.agent.$currentProjectId.set(null)
			} else {
				// Check if the other fairy is a member of the project
				const isOtherFairyInProject =
					project.memberIds.includes(otherFairyId) || project.orchestratorId === otherFairyId

				if (!isOtherFairyInProject) {
					this.agent.cancel()
					this.agent.schedule({
						messages: [
							`You are currently working on project "${project.name}". You can only assign todo items to fairies that are members of this project. Fairy with id ${otherFairyId} is not a member of your current project.`,
						],
					})
					return
				}

				// Get todos from the shared list that belong to this project
				const projectTodoItems = $sharedTodoList
					.get()
					.filter((item) => item.projectId === currentProjectId)
				const todoItems = projectTodoItems.filter((item) => todoItemIds.includes(item.id))

				const todoIdsThatDontExist = todoItemIds.filter(
					(id) => !todoItems.some((item) => item.id === id)
				)
				const todoIdsThatAreAlreadyClaimed = todoItems
					.filter((item) => item.claimedById !== undefined && item.claimedById !== '')
					.map((item) => item.id)

				if (todoIdsThatDontExist.length > 0) {
					this.agent.cancel()
					this.agent.schedule({
						messages: [
							`Todo item(s) with id(s) ${todoIdsThatDontExist.join(', ')} not found in your current project "${project.name}". You can only assign todo items that belong to your current project.`,
						],
					})
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
					this.agent.schedule({
						messages: [
							`Todo item(s) with id(s) ${todoIdsThatAreAlreadyClaimed.join(', ')} are already claimed by ${claimedByNames.join(', ')}.`,
						],
					})
					return
				}

				const validTodoItems = todoItems.filter(
					(item) =>
						!todoIdsThatAreAlreadyClaimed.includes(item.id) &&
						!todoIdsThatDontExist.includes(item.id)
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
				return
			}
		}

		// Agent is not in a project, use the shared todo list
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
