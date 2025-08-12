import { Box } from 'tldraw'
import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToSimplish'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class AgentViewportShapesPartUtil extends PromptPartUtil {
	static override type = 'agentViewportShapes' as const

	override async getPart(options: TLAgentPromptOptions) {
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
