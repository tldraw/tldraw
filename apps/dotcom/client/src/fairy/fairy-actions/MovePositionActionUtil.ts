import { MoveViewportAction as MovePositionAction, Streaming } from '@tldraw/fairy-shared'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { AgentActionUtil } from './AgentActionUtil'

export class MovePositionActionUtil extends AgentActionUtil<MovePositionAction> {
	static override type = 'move-position' as const

	override getInfo(action: Streaming<MovePositionAction>) {
		const text = action.intent?.startsWith('#') ? `\n\n${action.intent}` : action.intent
		return {
			icon: 'eye' as const,
			description: `${text ?? ''}`,
			pose: 'active' as const,
		}
	}

	override applyAction(action: Streaming<MovePositionAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return

		const position = helpers.removeOffsetFromVec({
			x: action.x,
			y: action.y,
		})

		this.agent.positionManager.moveTo(position)
	}
}
