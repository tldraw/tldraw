import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToModelish'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartHandler } from './PromptPartHandler'

export class UserSelectedShapesPromptPart extends PromptPartHandler {
	static override type = 'userSelectedShapes' as const

	override async getPromptPart(options: TLAgentPromptOptions) {
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
