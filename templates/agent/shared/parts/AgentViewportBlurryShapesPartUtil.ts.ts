import { Box } from 'tldraw'
import { BlurryShape, convertTldrawShapeToBlurryShape } from '../format/BlurryShape'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class AgentViewportBlurryShapesPartUtil extends PromptPartUtil<BlurryShape[]> {
	static override type = 'blurryFormat' as const

	override getPriority() {
		return 70
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor, request } = options
		const shapes = editor.getCurrentPageShapesSorted()

		const contextBoundsBox = Box.From(request.bounds)

		const blurryShapes = shapes
			.map((shape) => {
				const bounds = editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (!contextBoundsBox.includes(bounds)) return null
				return convertTldrawShapeToBlurryShape(shape, editor)
			})
			.filter((s) => s !== null)

		return blurryShapes
	}

	override buildContent(blurryShapes: BlurryShape[]): string[] {
		if (blurryShapes.length === 0) return ['There are no shapes in your view at the moment.']

		return [`These are the shapes you can currently see:`, JSON.stringify(blurryShapes)]
	}
}
