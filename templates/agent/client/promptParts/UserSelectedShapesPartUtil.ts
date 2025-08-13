import { structuredClone } from 'tldraw'
import { ISimpleShape } from '../../worker/simple/SimpleShape'
import { AgentTransform } from '../AgentTransform'
import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToSimplish'
import { AgentPrompt, AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class UserSelectedShapesPartUtil extends PromptPartUtil {
	static override type = 'userSelectedShapes' as const

	static override getPriority(_prompt: AgentPrompt): number {
		return 55 // selected shapes after context items (low priority)
	}

	override async getPart(_options: AgentPromptOptions) {
		const userSelectedShapes = this.editor.getSelectedShapes().map((v) => structuredClone(v)) ?? []
		if (!userSelectedShapes) return undefined

		const shapes = []

		for (const shape of userSelectedShapes) {
			if (!shape) continue
			const simpleShape = convertShapeToSimpleShape(shape, this.editor)
			if (simpleShape) {
				shapes.push(simpleShape)
			}
		}

		return shapes
	}

	override transformPromptPart(
		promptPart: ISimpleShape[],
		transform: AgentTransform,
		_prompt: Partial<AgentPrompt>
	): ISimpleShape[] {
		return promptPart
			.map((shape) => transform.sanitizeExistingShape(shape))
			.filter((shape): shape is ISimpleShape => shape !== null)
	}

	static override buildContent(_prompt: AgentPrompt, userSelectedShapes: ISimpleShape[]): string[] {
		if (!userSelectedShapes || userSelectedShapes.length === 0) {
			return []
		}

		return [
			'The user has selected these shapes. Focus your task on these shapes where applicable:',
			userSelectedShapes.map((shape) => JSON.stringify(shape, null, 2)).join('\n'),
		]
	}
}
