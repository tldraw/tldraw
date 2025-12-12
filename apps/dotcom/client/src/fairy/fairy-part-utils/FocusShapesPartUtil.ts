import {
	AgentRequest,
	convertTldrawShapeToFocusedShape,
	FocusedShape,
	FocusShapesPart,
} from '@tldraw/fairy-shared'
import { Box } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class FocusShapesPartUtil extends PromptPartUtil<FocusShapesPart> {
	static override type = 'focusShapes' as const

	override getPart(request: AgentRequest, helpers: AgentHelpers): FocusShapesPart {
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

		// Convert the shapes to the focused shape format
		const focusedShapes = shapesInBounds
			.map((shape) => {
				if (!editor) return null
				return convertTldrawShapeToFocusedShape(editor, shape)
			})
			.filter((s) => s !== null) as FocusedShape[]

		// Apply the offset and round the focused shapes
		const normalizedFocusedShapes = focusedShapes.map((shape) => {
			// Apply offset using AgentHelpers method
			const offsetShape = helpers.applyOffsetToShape(shape)
			// Round the shape using AgentHelpers method
			return helpers.roundShape(offsetShape)
		})

		return { type: 'focusShapes', shapes: normalizedFocusedShapes }
	}
}
