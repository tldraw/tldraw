import {
	AgentRequest,
	BlurryShapesPart,
	convertTldrawShapeToBlurryShape,
} from '@tldraw/fairy-shared'
import { Box } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class BlurryShapesPartUtil extends PromptPartUtil<BlurryShapesPart> {
	static override type = 'blurryShapes' as const

	override getPart(request: AgentRequest, helpers: AgentHelpers): BlurryShapesPart {
		const { editor } = this

		const shapes = editor.getCurrentPageShapesSorted()
		const contextBoundsBox = Box.From(request.bounds)

		// Get all shapes within the agent's viewport
		const shapesInBounds = shapes.filter((shape) => {
			if (!editor) return false
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return false
			return contextBoundsBox.includes(bounds)
		})

		// Convert the shapes to the blurry shape format
		const blurryShapes = shapesInBounds
			.map((shape) => {
				if (!editor) return null
				return convertTldrawShapeToBlurryShape(editor, shape)
			})
			.filter((s) => s !== null)

		// Apply the offset and round the blurry shapes
		const normalizedBlurryShapes = blurryShapes.map((shape) => {
			const bounds = helpers.roundBox(
				helpers.applyOffsetToBox({
					x: shape.x,
					y: shape.y,
					w: shape.w,
					h: shape.h,
				})
			)
			return { ...shape, x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h }
		})

		return { type: 'blurryShapes', shapes: normalizedBlurryShapes }
	}
}
