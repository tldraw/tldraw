import { TLShapeId } from 'tldraw'
import { BringToFrontAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const BringToFrontActionUtil = registerActionUtil(
	class BringToFrontActionUtil extends AgentActionUtil<BringToFrontAction> {
		static override type = 'bringToFront' as const

		override getInfo(action: Streaming<BringToFrontAction>) {
			return {
				icon: 'cursor' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<BringToFrontAction>, helpers: AgentHelpers) {
			action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
			return action
		}

		override applyAction(action: Streaming<BringToFrontAction>) {
			if (!action.shapeIds) return
			this.editor.bringToFront(action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId))
		}
	}
)
