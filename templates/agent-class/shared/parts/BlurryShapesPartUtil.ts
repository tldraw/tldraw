import { Box } from 'tldraw'
import { AgentHelpers } from '../AgentHelpers'
import { BlurryShape } from '../format/BlurryShape'
import { convertTldrawShapeToBlurryShape } from '../format/convertTldrawShapeToBlurryShape'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface BlurryShapesPart extends BasePromptPart<'blurryShapes'> {
	shapes: BlurryShape[] | null
}

export class BlurryShapesPartUtil extends PromptPartUtil<BlurryShapesPart> {
	static override type = 'blurryShapes' as const

	override getPriority() {
		return 70
	}

	override getPart(request: AgentRequest, helpers: AgentHelpers): BlurryShapesPart {
		if (!this.agent) return { type: 'blurryShapes', shapes: null }
		const { editor } = this.agent

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

		return {
			type: 'blurryShapes',
			shapes: normalizedBlurryShapes,
		}
	}

	override buildContent({ shapes }: BlurryShapesPart): string[] {
		if (!shapes || shapes.length === 0) return ['There are no shapes in your view at the moment.']

		return [`These are the shapes you can currently see:`, JSON.stringify(shapes)]
	}
}
