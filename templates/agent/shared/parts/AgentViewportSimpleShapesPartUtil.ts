import { Box } from 'tldraw'
import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { AgentTransform } from '../AgentTransform'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'
import { convertTldrawShapeToSimpleShape } from './convertTldrawShapeToSimpleShape'
import { getWholePageContent } from './getWholePageContent'

export class AgentViewportSimpleShapesPartUtil extends PromptPartUtil<ISimpleShape[]> {
	static override type = 'agentViewportShapes' as const

	override getPriority() {
		return 70 // viewport shapes after bounds (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor, request } = options
		const currentPageContent = getWholePageContent({ editor })

		const contextBoundsBox = Box.From(request.bounds)

		const shapes = currentPageContent.shapes
			.map((shape) => {
				const bounds = editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (!contextBoundsBox.includes(bounds)) return null
				return convertTldrawShapeToSimpleShape(shape, editor)
			})
			.filter((s) => s !== null)

		return shapes
	}

	override transformPart(part: ISimpleShape[], transform: AgentTransform): ISimpleShape[] {
		return part.map((shape) => transform.roundShape(shape))
	}

	override buildContent(agentViewportShapes: ISimpleShape[]): string[] {
		if (agentViewportShapes.length === 0) return ['Your current viewport is empty.']

		return [`Here are the shapes you can currently see:`, JSON.stringify(agentViewportShapes)]
	}
}
