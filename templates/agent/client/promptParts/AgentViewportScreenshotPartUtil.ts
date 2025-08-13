import { Box, FileHelpers } from 'tldraw'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class AgentViewportScreenshotPartUtil extends PromptPartUtil<string | null> {
	static override type = 'agentViewportScreenshot' as const

	override getPriority() {
		return 40 // screenshot after text content (medium priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor, request } = options
		const contextBounds = request.bounds

		const shapes = editor.getCurrentPageShapesSorted().filter((shape) => {
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return false
			return Box.From(contextBounds).includes(bounds)
		})

		if (shapes.length === 0) return null

		const result = await editor.toImage(shapes, {
			format: 'jpeg',
			background: true,
			bounds: Box.From(request.bounds),
			padding: 0,
		})

		return await FileHelpers.blobToDataUrl(result.blob)
	}

	override buildContent(agentViewportScreenshot: string | null) {
		if (!agentViewportScreenshot) return []

		return [
			'Here is a screenshot of your current viewport on the canvas. It is what you can see right at this moment. It is not a reference image.',
			agentViewportScreenshot,
		]
	}
}
