import { structuredClone } from 'tldraw'
import { AgentHelpers } from '../AgentHelpers'
import { convertTldrawShapeToSimpleShape } from '../format/convertTldrawShapeToSimpleShape'
import { ISimpleShape } from '../format/SimpleShape'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface SelectedShapesPart extends BasePromptPart<'selectedShapes'> {
	shapes: ISimpleShape[]
}

export class SelectedShapesPartUtil extends PromptPartUtil<SelectedShapesPart> {
	static override type = 'selectedShapes' as const

	override getPriority() {
		return 55 // selected shapes after context items (low priority)
	}

	override getPart(_request: AgentRequest, agentHelpers: AgentHelpers): SelectedShapesPart {
		const { editor } = agentHelpers
		const userSelectedShapes = editor.getSelectedShapes().map((v) => structuredClone(v)) ?? []

		const simpleShapes: ISimpleShape[] = []
		for (const shape of userSelectedShapes) {
			if (!shape) continue
			const simpleShape = convertTldrawShapeToSimpleShape(shape, editor)
			if (simpleShape) {
				simpleShapes.push(simpleShape)
			}
		}

		const normalizedSimpleShapes = simpleShapes.map((shape) => {
			const offsetShape = agentHelpers.applyOffsetToShape(shape)
			return agentHelpers.roundShape(offsetShape)
		})

		return {
			type: 'selectedShapes',
			shapes: normalizedSimpleShapes,
		}
	}

	override buildContent({ shapes }: SelectedShapesPart) {
		if (!shapes || shapes.length === 0) {
			return []
		}

		return [
			'The user has selected these shapes. Focus your task on these shapes where applicable:',
			shapes.map((shape) => JSON.stringify(shape)).join('\n'),
		]
	}
}
