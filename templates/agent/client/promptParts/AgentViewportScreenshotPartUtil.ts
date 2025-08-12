import { Box, FileHelpers, TLShape } from 'tldraw'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class AgentViewportScreenshotPartUtil extends PromptPartUtil {
	static override type = 'agentViewportScreenshot' as const

	override async getPart(options: TLAgentPromptOptions) {
		const { contextBounds } = options
		const shapes = this.editor.getCurrentPageShapesSorted().filter((shape) => {
			const bounds = this.editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return false
			return Box.From(contextBounds).includes(bounds)
		})

		const image = await this.getScreenshot({
			shapes,
			bounds: contextBounds,
		})

		return { agentViewportScreenshot: image }
	}

	private async getScreenshot({ shapes, bounds }: { shapes: TLShape[]; bounds: any }) {
		if (shapes.length === 0) return undefined
		const result = await this.editor.toImage(shapes, {
			format: 'jpeg',
			background: true,
			bounds: Box.From(bounds),
			padding: 0,
		})

		return await FileHelpers.blobToDataUrl(result.blob)
	}
}
