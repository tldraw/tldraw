import { TLShapeId } from 'tldraw'
import { DistributeAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const DistributeActionUtil = registerActionUtil(
	class DistributeActionUtil extends AgentActionUtil<DistributeAction> {
		static override type = 'distribute' as const

		override getInfo(action: Streaming<DistributeAction>) {
			return {
				icon: 'cursor' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<DistributeAction>, helpers: AgentHelpers) {
			action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
			return action
		}

		override applyAction(action: Streaming<DistributeAction>) {
			if (!action.complete) return

			this.editor.distributeShapes(
				action.shapeIds.map((id) => `shape:${id}` as TLShapeId),
				action.direction
			)
		}
	}
)
