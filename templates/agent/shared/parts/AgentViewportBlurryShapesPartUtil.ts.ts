import { Box } from 'tldraw'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { BlurryShape, convertTldrawShapeToBlurryShape } from './convertTldrawShapeToBlurryShape'
import { getWholePageContent } from './getWholePageContent'
import { PromptPartUtil } from './PromptPartUtil'

export class AgentViewportBlurryShapesPartUtil extends PromptPartUtil<BlurryShape[]> {
	static override type = 'blurryFormat' as const

	override getPriority() {
		return 70
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor, request } = options
		const currentPageContent = getWholePageContent({ editor })

		const contextBoundsBox = Box.From(request.bounds)

		const blurryShapes = currentPageContent.shapes
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
		if (blurryShapes.length === 0) return ['Your current viewport is empty.']

		return [`Here is a list of shapes you can currently see:`, JSON.stringify(blurryShapes)]
	}
}
