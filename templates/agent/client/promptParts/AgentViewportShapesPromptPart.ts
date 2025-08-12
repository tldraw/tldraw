import { Box } from 'tldraw'
import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToModelish'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartHandler } from './PromptPartHandler'

export class AgentViewportShapesPromptPart extends PromptPartHandler {
	static override type = 'agentViewportShapes' as const

	override async getPromptPart(options: TLAgentPromptOptions) {
		const { currentPageContent, contextBounds } = options
		const shapes = currentPageContent.shapes
			.map((shape) => {
				const bounds = this.editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (!Box.From(contextBounds).includes(bounds)) return null
				return convertShapeToSimpleShape(shape, this.editor)
			})
			.filter((s) => s !== null)

		return { agentViewportShapes: shapes }
	}
}
