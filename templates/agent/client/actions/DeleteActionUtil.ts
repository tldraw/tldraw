import { TLShapeId } from 'tldraw'
import { DeleteAction } from '../../shared/schema/AgentActionSchemas'
import { BaseAgentAction } from '../../shared/types/BaseAgentAction'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const DeleteActionUtil = registerActionUtil(
	class DeleteActionUtil extends AgentActionUtil<DeleteAction> {
		static override type = 'delete' as const

		override getInfo(action: Streaming<DeleteAction>) {
			return {
				icon: 'trash' as const,
				description: action.intent ?? '',
				canGroup: (other: Streaming<BaseAgentAction>) => other._type === 'delete',
			}
		}

		override sanitizeAction(action: Streaming<DeleteAction>, helpers: AgentHelpers) {
			if (!action.complete) return action

			const shapeId = helpers.ensureShapeIdExists(action.shapeId)
			if (!shapeId) return null

			action.shapeId = shapeId
			return action
		}

		override applyAction(action: Streaming<DeleteAction>) {
			if (!action.complete) return

			this.editor.deleteShape(`shape:${action.shapeId}` as TLShapeId)
		}
	}
)
