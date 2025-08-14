import { Box } from 'tldraw'
import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { AgentTransform } from '../AgentTransform'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'
import { convertTldrawShapeToSimpleShape } from './convertTldrawShapeToSimpleShape'
import { getWholePageContent } from './getWholePageContent'

export class AgentViewportShapesPartUtil extends PromptPartUtil<ISimpleShape[]> {
	static override type = 'agentViewportShapes' as const

	override getPriority() {
		return 70 // viewport shapes after bounds (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor, request } = options
		const currentPageContent = getWholePageContent({ editor })
		const contextBounds = request.bounds

		const shapes = currentPageContent.shapes
			.map((shape) => {
				const bounds = editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (!Box.From(contextBounds).includes(bounds)) return null
				return convertTldrawShapeToSimpleShape(shape, editor)
			})
			.filter((s) => s !== null)

		return shapes
	}

	override transformPart(part: ISimpleShape[], transform: AgentTransform): ISimpleShape[] {
		return part.map((shape) => transform.roundShape(shape))
	}

	override buildContent(agentViewportShapes: ISimpleShape[]): string[] {
		return [
			agentViewportShapes.length > 0
				? `Here are the shapes in your current viewport:\n${JSON.stringify(agentViewportShapes).replaceAll('\n', ' ')}`
				: 'Your current viewport is empty.',
		]
	}
}
