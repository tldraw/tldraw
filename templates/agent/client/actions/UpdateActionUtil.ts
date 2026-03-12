import { TLBindingId } from 'tldraw'
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

			// Ensure the shape ID refers to a real shape
			const shapeId = helpers.ensureShapeIdExists(toSimpleShapeId(update.shapeId))
			if (!shapeId) return null
			update.shapeId = shapeId

			// If it's an arrow, ensure the from and to IDs refer to real shapes
			if (update._type === 'arrow') {
				if (update.fromId) {
					update.fromId = helpers.ensureShapeIdExists(update.fromId)
				}
				if (update.toId) {
					update.toId = helpers.ensureShapeIdExists(update.toId)
				}

				if ('x1' in update) {
					update.x1 = helpers.ensureValueIsNumber(update.x1) ?? 0
				}
				if ('y1' in update) {
					update.y1 = helpers.ensureValueIsNumber(update.y1) ?? 0
				}
				if ('x2' in update) {
					update.x2 = helpers.ensureValueIsNumber(update.x2) ?? 0
				}
				if ('y2' in update) {
					update.y2 = helpers.ensureValueIsNumber(update.y2) ?? 0
				}
				if ('bend' in update) {
					update.bend = helpers.ensureValueIsNumber(update.bend) ?? 0
				}
			}

			// Unround the shape to restore the original values
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

			// Handle arrow bindings if they exist
			if (result.bindings) {
				// First, clean up existing bindings
				const existingBindings = editor.getBindingsFromShape(shapeId, 'arrow')
				for (const binding of existingBindings) {
					editor.deleteBinding(binding.id as TLBindingId)
				}

				// Create new bindings
				for (const binding of result.bindings) {
					editor.createBinding({
						type: binding.type,
						fromId: binding.fromId,
						toId: binding.toId,
						props: binding.props,
						meta: binding.meta,
					})
				}
			}
		}
	}
)
