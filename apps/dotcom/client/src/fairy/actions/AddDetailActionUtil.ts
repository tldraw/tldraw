import { AddDetailAction, Streaming } from '@tldraw/fairy-shared'
import { AgentActionUtil } from './AgentActionUtil'

export class AddDetailActionUtil extends AgentActionUtil<AddDetailAction> {
	static override type = 'add-detail' as const

	override getInfo(action: Streaming<AddDetailAction>) {
		// const label = 'Adding detail'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		// const description = `**${label}:** ${text ?? ''}`
		const description = `${text ?? ''}`

		return {
			icon: 'pencil' as const,
			description,
		}
	}

	override applyAction(action: Streaming<AddDetailAction>) {
		if (!action.complete) return
		if (!this.agent) return
		this.agent.schedule('Add detail to the canvas.')
	}
}
