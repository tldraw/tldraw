import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const AddDetailAction = z
	.object({
		_type: z.literal('add-detail'),
		intent: z.string(),
	})
	.meta({
		title: 'Add Detail',
		description: 'The AI plans further work so that it can add detail to its work.',
	})

type IAddDetailAction = z.infer<typeof AddDetailAction>

export class AddDetailActionUtil extends AgentActionUtil<IAddDetailAction> {
	static override type = 'add-detail' as const

	override getSchema() {
		return AddDetailAction
	}

	override getInfo(action: Streaming<IAddDetailAction>) {
		const label = 'Adding detail'
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		const description = `**${label}:** ${text ?? ''}`

		return {
			icon: 'pencil' as const,
			description,
		}
	}

	override applyAction(action: Streaming<IAddDetailAction>, agentHelpers: AgentHelpers) {
		if (!action.complete) return
		const { agent } = agentHelpers
		agent.schedule('Add detail to the canvas.')
	}
}
