import { TLShapeId } from 'tldraw'
import { AlignAction } from '../../shared/schema/AgentActionSchemas'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const AlignActionUtil = registerActionUtil(
	class AlignActionUtil extends AgentActionUtil<AlignAction> {
		static override type = 'align' as const

		override getInfo(action: Streaming<AlignAction>) {
			return {
				icon: 'cursor' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<AlignAction>, helpers: AgentHelpers) {
			action.shapeIds = helpers.ensureShapeIdsExist(action.shapeIds ?? [])
			return action
		}

		override applyAction(action: Streaming<AlignAction>) {
			if (!action.complete) return

			this.editor.alignShapes(
				action.shapeIds.map((id) => `shape:${id}` as TLShapeId),
				action.alignment
			)
		}
	}
)
