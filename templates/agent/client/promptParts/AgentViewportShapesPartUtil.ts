import { Box } from 'tldraw'
import { getWholePageContent } from '../ai/promptConstruction/getWholePageContent'
import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToSimplish'
import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class AgentViewportShapesPartUtil extends PromptPartUtil {
	static override type = 'agentViewportShapes' as const

	static override getPriority(_prompt: TLAgentPrompt): number {
		return 70 // viewport shapes after bounds (low priority)
	}

	override async getPart(options: TLAgentPromptOptions) {
		const currentPageContent = getWholePageContent({ editor: this.editor })
		const contextBounds = options.request?.bounds
		if (!contextBounds) return undefined

		const shapes = currentPageContent.shapes
			.map((shape) => {
				const bounds = this.editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (!Box.From(contextBounds).includes(bounds)) return null
				return convertShapeToSimpleShape(shape, this.editor)
			})
			.filter((s) => s !== null)

		return shapes
	}

	static override buildContent(_prompt: TLAgentPrompt, agentViewportShapes: any[]): string[] {
		return [
			agentViewportShapes.length > 0
				? `Here are the shapes in your current viewport:\n${JSON.stringify(agentViewportShapes).replaceAll('\n', ' ')}`
				: 'Your current viewport is empty.',
		]
	}
}
