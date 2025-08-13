import { Box, FileHelpers, TLShape } from 'tldraw'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class AgentViewportScreenshotPartUtil extends PromptPartUtil {
	static override type = 'agentViewportScreenshot' as const

	static override getPriority(_prompt: AgentPrompt): number {
		return 40 // screenshot after text content (medium priority)
	}

	override async getPart(options: Partial<AgentPromptOptions>) {
		const contextBounds = options.request?.bounds

		if (!contextBounds) return undefined

		const shapes = this.editor.getCurrentPageShapesSorted().filter((shape) => {
			const bounds = this.editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return false
			return Box.From(contextBounds).includes(bounds)
		})

		const image = await this.getScreenshot({
			shapes,
			bounds: contextBounds,
		})

		return image
	}

	private async getScreenshot({ shapes, bounds }: { shapes: TLShape[]; bounds: any }) {
		if (shapes.length === 0) return ''
		const result = await this.editor.toImage(shapes, {
			format: 'jpeg',
			background: true,
			bounds: Box.From(bounds),
			padding: 0,
		})

		return await FileHelpers.blobToDataUrl(result.blob)
	}

	static override buildContent(_prompt: AgentPrompt, agentViewportScreenshot: string): string[] {
		if (!agentViewportScreenshot) return ['']

		return [
			'Here is a screenshot of your current viewport on the canvas. It is what you can see right at this moment. It is not a reference image.',
			agentViewportScreenshot,
		]
	}
}
