import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToSimplish'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class UserSelectedShapesPartUtil extends PromptPartUtil {
	static override type = 'userSelectedShapes' as const

	override async getPart(options: TLAgentPromptOptions) {
		const { userSelectedShapeIds } = options
		const shapes = []

		for (const shapeId of userSelectedShapeIds) {
			const shape = this.editor.getShape(shapeId)
			if (!shape) continue
			const simpleShape = convertShapeToSimpleShape(shape, this.editor)
			if (simpleShape) {
				shapes.push(simpleShape)
			}
		}

		return { userSelectedShapes: shapes }
	}
}
