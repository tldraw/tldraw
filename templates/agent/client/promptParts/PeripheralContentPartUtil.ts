import { Box } from 'tldraw'
import { convertShapeToPeripheralContent } from '../ai/promptConstruction/translateFromDrawishToModelish'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class PeripheralContentPartUtil extends PromptPartUtil {
	static override type = 'peripheralContent' as const

	override async getPart(options: TLAgentPromptOptions) {
		const { currentPageContent, contextBounds } = options
		const shapes = currentPageContent.shapes
			.map((shape) => {
				const bounds = this.editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (Box.From(contextBounds).includes(bounds)) return null
				return convertShapeToPeripheralContent(shape, this.editor)
			})
			.filter((s) => s !== null)

		return { peripheralContent: shapes }
	}
}
