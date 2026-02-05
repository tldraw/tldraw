import { TLShapeId } from 'tldraw'
import { ResizeAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const ResizeActionUtil = registerActionUtil(
	class ResizeActionUtil extends AgentActionUtil<ResizeAction> {
		static override type = 'resize' as const

		override getInfo(action: Streaming<ResizeAction>) {
			return {
				icon: 'cursor' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<ResizeAction>, helpers: AgentHelpers) {
			const shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
			if (shapeIds.length === 0) return null

			action.shapeIds = shapeIds
			return action
		}

		override applyAction(action: Streaming<ResizeAction>, helpers: AgentHelpers) {
			if (
				!action.shapeIds ||
				!action.scaleX ||
				!action.scaleY ||
				!action.originX ||
				!action.originY
			) {
				return
			}

			const origin = helpers.removeOffsetFromVec({ x: action.originX, y: action.originY })
			const shapeIds = action.shapeIds.map((shapeId) => `shape:${shapeId}` as TLShapeId)

			for (const shapeId of shapeIds) {
				this.editor.resizeShape(
					shapeId,
					{ x: action.scaleX, y: action.scaleY },
					{ scaleOrigin: origin }
				)
			}
		}
	}
)
