import { TLShapeId } from 'tldraw'
import { StackAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const StackActionUtil = registerActionUtil(
	class StackActionUtil extends AgentActionUtil<StackAction> {
		static override type = 'stack' as const

		override getInfo(action: Streaming<StackAction>) {
			return {
				icon: 'cursor' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<StackAction>, helpers: AgentHelpers) {
			if (!action.complete) return action

			action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds)

			return action
		}

		override applyAction(action: Streaming<StackAction>) {
			if (!action.complete) return

			this.editor.stackShapes(
				action.shapeIds.map((id) => `shape:${id}` as TLShapeId),
				action.direction,
				Math.max(action.gap, 0)
			)
		}
	}
)
