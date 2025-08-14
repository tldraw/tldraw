import { Box, BoxModel } from 'tldraw'
import { roundBox } from '../AgentTransform'
import { convertTldrawShapeToPeripheralShape } from '../ai/promptConstruction/convertTldrawShapeToPeripheralShape'
import { getWholePageContent } from '../ai/promptConstruction/getWholePageContent'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class PeripheralShapesPartUtil extends PromptPartUtil<BoxModel[]> {
	static override type = 'peripheralShapes' as const

	override getPriority() {
		return 65 // peripheral content after viewport shapes (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor, request } = options
		const currentPageContent = getWholePageContent({ editor })
		const contextBounds = request.bounds

		const shapes = currentPageContent.shapes
			.map((shape) => {
				const bounds = editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return
				if (Box.From(contextBounds).includes(bounds)) return
				return convertTldrawShapeToPeripheralShape(shape, editor)
			})
			.filter((s) => s !== undefined)

		return shapes
	}

	override transformPart(part: BoxModel[]): BoxModel[] | null {
		return part.map((shape) => roundBox(shape))
	}

	override buildContent(peripheralContent: BoxModel[]): string[] {
		if (peripheralContent.length === 0) {
			return []
		}

		return [
			`Here are the shapes in your peripheral vision, outside the viewport. You can only see their position and size, not their content. If you want to see their content, you need to get closer.`,
			JSON.stringify(peripheralContent),
		]
	}
}
