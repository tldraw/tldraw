import {
	convertFocusedShapeToTldrawShape,
	convertSimpleIdToTldrawId,
} from '../../shared/format/convertFocusedShapeToTldrawShape'
import { UpdateAction } from '../../shared/schema/AgentActionSchemas'
import { toSimpleShapeId } from '../../shared/types/ids-schema'
import { Streaming } from '../../shared/types/Streaming'
import { AgentHelpers } from '../AgentHelpers'
import { AgentActionUtil, registerActionUtil } from './AgentActionUtil'

export const UpdateActionUtil = registerActionUtil(
	class UpdateActionUtil extends AgentActionUtil<UpdateAction> {
		static override type = 'update' as const

		override getInfo(action: Streaming<UpdateAction>) {
			return {
				icon: 'cursor' as const,
				description: action.intent ?? '',
			}
		}

		override sanitizeAction(action: Streaming<UpdateAction>, helpers: AgentHelpers) {
			if (!action.complete) return action

			const { update } = action

			const shapeId = helpers.ensureShapeIdExists(toSimpleShapeId(update.shapeId))
			if (!shapeId) return null
			update.shapeId = shapeId

			if (update._type === 'arrow') {
				if (update.fromId) {
					update.fromId = helpers.ensureShapeIdExists(update.fromId)
				}
				if (update.toId) {
					update.toId = helpers.ensureShapeIdExists(update.toId)
				}
				for (const key of ['x1', 'y1', 'x2', 'y2', 'bend'] as const) {
					if (key in update) update[key] = helpers.ensureValueIsNumber(update[key]) ?? 0
				}
			}

			action.update = helpers.unroundShape(action.update)

			return action
		}

		override applyAction(action: Streaming<UpdateAction>, helpers: AgentHelpers) {
			if (!action.complete) return
			const { editor } = this

			// Translate the shape back to the chat's position
			action.update = helpers.removeOffsetFromShape(action.update)

			const shapeId = convertSimpleIdToTldrawId(action.update.shapeId)
			const existingShape = editor.getShape(shapeId)

			if (!existingShape) {
				throw new Error(`Shape ${shapeId} not found in canvas`)
			}

			const result = convertFocusedShapeToTldrawShape(editor, action.update, {
				defaultShape: existingShape,
			})

			editor.updateShape(result.shape)

			if (result.bindings) {
				for (const binding of editor.getBindingsFromShape(shapeId, 'arrow')) {
					editor.deleteBinding(binding.id)
				}
				for (const binding of result.bindings) {
					editor.createBinding(binding)
				}
			}
		}
	}
)
