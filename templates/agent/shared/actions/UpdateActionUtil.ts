import { TLBindingId } from 'tldraw'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import {
	convertSimpleIdToTldrawId,
	convertSimpleShapeToTldrawShapeWithDefaults,
} from '../format/convertSimpleShapeToTldrawShape'
import { SimpleShapeSchema } from '../format/SimpleShape'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const UpdateAction = z
	.object({
		_type: z.literal('update'),
		intent: z.string(),
		update: SimpleShapeSchema,
	})
	.meta({
		title: 'Update',
		description: 'The AI updates an existing shape.',
	})

type UpdateAction = z.infer<typeof UpdateAction>

export class UpdateActionUtil extends AgentActionUtil<UpdateAction> {
	static override type = 'update' as const

	override getSchema() {
		return UpdateAction
	}

	override getInfo(action: Streaming<UpdateAction>) {
		return {
			icon: 'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<UpdateAction>, agentHelpers: AgentHelpers) {
		if (!action.complete) return action

		const { update } = action

		// Ensure the shape ID refers to a real shape
		const shapeId = agentHelpers.ensureShapeIdExists(update.shapeId)
		if (!shapeId) return null
		update.shapeId = shapeId

		// If it's an arrow, ensure the from and to IDs refer to real shapes
		if (update._type === 'arrow') {
			if (update.fromId) {
				update.fromId = agentHelpers.ensureShapeIdExists(update.fromId)
			}
			if (update.toId) {
				update.toId = agentHelpers.ensureShapeIdExists(update.toId)
			}
		}

		// Unround the shape to restore the original values
		action.update = agentHelpers.unroundShape(action.update)

		return action
	}

	override applyAction(action: Streaming<UpdateAction>, agentHelpers: AgentHelpers) {
		if (!action.complete) return
		const { editor } = agentHelpers

		// Translate the shape back to the chat's position
		action.update = agentHelpers.removeOffsetFromShape(action.update)

		const simpleShapeId = agentHelpers.ensureShapeIdExists(action.update.shapeId)
		if (!simpleShapeId) return
		const shapeId = convertSimpleIdToTldrawId(simpleShapeId)

		const existingShape = editor.getShape(shapeId)

		if (!existingShape) {
			throw new Error(`Shape ${shapeId} not found in canvas`)
		}

		const result = convertSimpleShapeToTldrawShapeWithDefaults({
			editor,
			simpleShape: action.update,
			defaultShape: existingShape,
		})

		editor.updateShape(result.shape)

		// Handle arrow bindings if they exist
		if (result.bindings) {
			// First, clean up existing bindings for this arrow
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
