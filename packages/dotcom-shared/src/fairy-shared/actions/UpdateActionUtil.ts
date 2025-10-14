import { TLBindingId } from '@tldraw/editor'
import z from 'zod'
import { AgentHelpers } from '../AgentHelpers'
import {
	convertFocusedShapeToTldrawShape,
	convertSimpleIdToTldrawId,
} from '../format/convertFocusedShapeToTldrawShape'
import { FocusedShapeSchema } from '../format/FocusedShape'
import { Streaming } from '../types/Streaming'
import { AgentActionUtil } from './AgentActionUtil'

const UpdateAction = z
	.object({
		_type: z.literal('update'),
		intent: z.string(),
		update: FocusedShapeSchema,
	})
	.meta({
		title: 'Update',
		description: 'The fairy updates an existing shape.',
	})

type UpdateAction = z.infer<typeof UpdateAction>

export class UpdateActionUtil extends AgentActionUtil<UpdateAction> {
	static override type = 'update' as const

	override getSchema() {
		return UpdateAction
	}

	override getInfo(action: Streaming<UpdateAction>) {
		return {
			icon: null, //'cursor' as const,
			description: action.intent ?? '',
		}
	}

	override sanitizeAction(action: Streaming<UpdateAction>, helpers: AgentHelpers) {
		if (!action.complete) return action

		const { update } = action

		if (!update) return null

		// Ensure the shape ID refers to a real shape
		const shapeId = helpers.ensureShapeIdExists(update.shapeId)
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
		}

		// Unround the shape to restore the original values
		action.update = helpers.unroundShape(action.update)

		return action
	}

	override applyAction(action: Streaming<UpdateAction>, helpers: AgentHelpers) {
		if (!action.complete) return
		if (!this.agent) return
		const { editor } = this.agent

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

		if (!result.shape) {
			this.agent.move({
				x: existingShape.x,
				y: existingShape.y,
			})
			this.agent.schedule({ data: [`Updating shape ${shapeId} failed.`] })
			return
		}

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

		this.agent.move({
			x: result.shape.x,
			y: result.shape.y,
		})
	}
}
