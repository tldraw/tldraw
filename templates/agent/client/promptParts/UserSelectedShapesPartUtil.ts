import { structuredClone } from 'tldraw'
import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { AgentTransform } from '../AgentTransform'
import { convertTldrawShapeToSimpleShape } from '../ai/promptConstruction/convertTldrawShapeToSimpleShape'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class UserSelectedShapesPartUtil extends PromptPartUtil<ISimpleShape[]> {
	static override type = 'userSelectedShapes' as const

	override getPriority() {
		return 55 // selected shapes after context items (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const userSelectedShapes =
			options.editor.getSelectedShapes().map((v) => structuredClone(v)) ?? []

		const simpleShapes: ISimpleShape[] = []
		for (const shape of userSelectedShapes) {
			if (!shape) continue
			const simpleShape = convertTldrawShapeToSimpleShape(shape, options.editor)
			if (simpleShape) {
				simpleShapes.push(simpleShape)
			}
		}
		return simpleShapes
	}

	override transformPart(part: ISimpleShape[], transform: AgentTransform) {
		return part
			.map((shape) => transform.sanitizeExistingShape(shape))
			.filter((shape): shape is ISimpleShape => shape !== null)
	}

	override buildContent(userSelectedShapes: ISimpleShape[]) {
		if (!userSelectedShapes || userSelectedShapes.length === 0) {
			return []
		}

		return [
			'The user has selected these shapes. Focus your task on these shapes where applicable:',
			userSelectedShapes.map((shape) => JSON.stringify(shape, null, 2)).join('\n'),
		]
	}
}
