import { structuredClone } from 'tldraw'
import { convertShapeToSimpleShape } from '../ai/promptConstruction/translateFromDrawishToSimplish'
import { TLAgentPrompt, TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { PromptPartUtil } from './PromptPartUitl'

export class UserSelectedShapesPartUtil extends PromptPartUtil {
	static override type = 'userSelectedShapes' as const

	static override getPriority(_prompt: TLAgentPrompt): number {
		return 55 // selected shapes after context items (low priority)
	}

	override async getPart(_options: TLAgentPromptOptions) {
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

	static override buildContent(_prompt: TLAgentPrompt, userSelectedShapes: any[]): string[] {
		if (!userSelectedShapes || userSelectedShapes.length === 0) {
			return []
		}

		return [
			'The user has selected these shapes. Focus your task on these shapes where applicable:',
			userSelectedShapes.map((shape) => JSON.stringify(shape, null, 2)).join('\n'),
		]
	}
}
