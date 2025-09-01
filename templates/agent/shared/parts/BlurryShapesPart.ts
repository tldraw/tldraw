import { Box } from 'tldraw'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { BlurryShape, convertTldrawShapeToBlurryShape } from '../format/BlurryShape'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface BlurryShapesPart extends BasePromptPart<'blurryShapes'> {
	shapes: BlurryShape[]
}

export class BlurryShapesPartUtil extends PromptPartUtil<BlurryShapesPart> {
	static override type = 'blurryShapes' as const

	override getPriority() {
		return 70
	}

	override getPart(request: AgentRequest, agent: TldrawAgent): BlurryShapesPart {
		const { editor } = agent
		const shapes = editor.getCurrentPageShapesSorted()
		const contextBoundsBox = Box.From(request.bounds)
		const blurryShapes = shapes
			.map((shape) => {
				const bounds = editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return null
				if (!contextBoundsBox.includes(bounds)) return null
				return convertTldrawShapeToBlurryShape(shape, editor)
			})
			.filter((s) => s !== null)

		return {
			type: 'blurryShapes',
			shapes: blurryShapes,
		}
	}

	override buildContent({ shapes }: BlurryShapesPart): string[] {
		if (shapes.length === 0) return ['There are no shapes in your view at the moment.']

		return [`These are the shapes you can currently see:`, JSON.stringify(shapes)]
	}
}
