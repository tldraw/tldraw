import { Box, FileHelpers } from 'tldraw'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class AgentViewportScreenshotPartUtil extends PromptPartUtil<string | null> {
	static override type = 'agentViewportScreenshot' as const

	override getPriority() {
		return 40 // screenshot after text content (medium priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor, request } = options
		const contextBounds = request.bounds

		const contextBoundsBox = Box.From(contextBounds)

		const shapes = editor.getCurrentPageShapesSorted().filter((shape) => {
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return false
			return contextBoundsBox.includes(bounds)
		})

		if (shapes.length === 0) return null

		const largestDimension = Math.max(request.bounds.w, request.bounds.h)
		const scale = largestDimension > 8000 ? 8000 / largestDimension : 1

		const result = await editor.toImage(shapes, {
			format: 'jpeg',
			background: true,
			bounds: Box.From(request.bounds),
			padding: 0,
			pixelRatio: 1,
			scale,
		})

		return await FileHelpers.blobToDataUrl(result.blob)
	}

	override buildContent(agentViewportScreenshot: string | null) {
		if (!agentViewportScreenshot) return []

		return [
			'Here is the part of the canvas that you can currently see at this moment. It is not a reference image.',
			agentViewportScreenshot,
		]
	}
}
