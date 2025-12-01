import { FlyToBoundsAction, Streaming, createAgentActionInfo } from '@tldraw/fairy-shared'
import { Box } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class FlyToBoundsActionUtil extends AgentActionUtil<FlyToBoundsAction> {
	static override type = 'fly-to-bounds' as const

	override getInfo(action: Streaming<FlyToBoundsAction>) {
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		return createAgentActionInfo({
			icon: 'eye',
			description: `${text ?? ''}`,
			pose: 'active',
		})
	}

	override applyAction(action: Streaming<FlyToBoundsAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const bounds = helpers.removeOffsetFromBox({
			x: action.x,
			y: action.y,
			w: action.w,
			h: action.h,
		})

		this.agent.position.moveTo(Box.From(bounds).center)
		this.agent.interrupt({
			input: {
				bounds,
				agentMessages: [
					`Just flew to new area with the intent: ${action.intent}. Can now see the new area at (${bounds.x}, ${bounds.y}) and is ${bounds.w}x${bounds.h} in size.`,
				],
			},
		})
	}
}
