import { Box } from 'tldraw'
import { getWholePageContent } from '../ai/promptConstruction/getWholePageContent'
import { convertShapeToPeripheralContent } from '../ai/promptConstruction/translateFromDrawishToModelish'
import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class PeripheralContentPartUtil extends PromptPartUtil {
	static override type = 'peripheralContent' as const

	static override getPriority(_prompt: TLAgentPrompt): number {
		return 65 // peripheral content after viewport shapes (low priority)
	}

	override async getPart(options: TLAgentPromptOptions) {
		const currentPageContent = getWholePageContent({ editor: this.editor })
		const contextBounds = options.request?.bounds
		if (!contextBounds) return undefined

		const shapes = currentPageContent.shapes
			.map((shape) => {
				const bounds = this.editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (Box.From(contextBounds).includes(bounds)) return null
				return convertShapeToPeripheralContent(shape, this.editor)
			})
			.filter((s) => s !== null)

		return shapes
	}

	static override buildContent(_prompt: TLAgentPrompt, peripheralContent: any[]): string[] {
		if (!peripheralContent || peripheralContent.length === 0) {
			return []
		}

		return [
			`Here are the shapes in your peripheral vision, outside the viewport. You can only see their position and size, not their content. If you want to see their content, you need to get closer.`,
			JSON.stringify(peripheralContent),
		]
	}
}
