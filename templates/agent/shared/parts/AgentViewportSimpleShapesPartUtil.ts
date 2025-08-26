import { Box } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { convertTldrawShapeToSimpleShape, ISimpleShape } from '../format/SimpleShape'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'

export class AgentViewportSimpleShapesPartUtil extends PromptPartUtil<ISimpleShape[]> {
	static override type = 'agentViewportShapes' as const

	override getPriority() {
		return 70 // viewport shapes after bounds (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor, request } = options
		const shapes = editor.getCurrentPageShapesSorted()

		const contextBoundsBox = Box.From(request.bounds)

		const simpleShapes = shapes
			.map((shape) => {
				const bounds = editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (!contextBoundsBox.includes(bounds)) return null
				return convertTldrawShapeToSimpleShape(shape, editor)
			})
			.filter((s) => s !== null)

		return simpleShapes
	}

	override transformPart(part: ISimpleShape[], transform: AgentTransform): ISimpleShape[] {
		return part.map((shape) => transform.roundShape(shape))
	}

	override buildContent(agentViewportShapes: ISimpleShape[]): string[] {
		if (agentViewportShapes.length === 0) return ['There are no shapes in your view at the moment.']

		return [`Here are the shapes you can currently see:`, JSON.stringify(agentViewportShapes)]
	}
}
