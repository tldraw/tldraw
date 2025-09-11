import z from 'zod'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const ClearAction = z
	.object({
		// All agent actions must have a _type field
		// We use an underscore to encourage the model to put this field first
		_type: z.literal('clear'),
	})
	.meta({
		// Give the action a title and description to tell the model what this action does
		title: 'Clear',
		description: 'The agent deletes all shapes on the canvas.',
	})

type ClearAction = z.infer<typeof ClearAction>

export class ClearActionUtil extends AgentActionUtil<ClearAction> {
	static override type = 'clear' as const

	/**
	 * Tell the model what the action's schema is
	 */
	override getSchema() {
		return ClearAction
	}

	/**
	 * Tell the model how to display this action in the chat history UI
	 */
	override getInfo() {
		return {
			icon: 'trash' as const,
			description: 'Cleared the canvas',
		}
	}

	/**
	 * Tell the model how to apply the action
	 */
	override applyAction(action: Streaming<ClearAction>) {
		// Don't do anything if the action hasn't finished streaming
		if (!action.complete) return

		// Delete all shapes on the page
		if (!this.agent) return
		const { editor } = this.agent

		const allShapes = editor.getCurrentPageShapes()
		editor.deleteShapes(allShapes)
	}
}
