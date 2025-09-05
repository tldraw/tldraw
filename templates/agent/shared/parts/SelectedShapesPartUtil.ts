import { structuredClone } from 'tldraw'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { AgentRequestTransform } from '../AgentRequestTransform'
import { convertTldrawShapeToSimpleShape, ISimpleShape } from '../format/SimpleShape'
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

	override getPart(_request: AgentRequest, agent: TldrawAgent): SelectedShapesPart {
		const { editor } = agent
		const userSelectedShapes = editor.getSelectedShapes().map((v) => structuredClone(v)) ?? []

		const simpleShapes: ISimpleShape[] = []
		for (const shape of userSelectedShapes) {
			if (!shape) continue
			const simpleShape = convertTldrawShapeToSimpleShape(shape, editor)
			if (simpleShape) {
				simpleShapes.push(simpleShape)
			}
		}
		return {
			type: 'selectedShapes',
			shapes: simpleShapes,
		}
	}

	override transformPart(part: SelectedShapesPart, transform: AgentRequestTransform) {
		const transformedShapes = part.shapes.map((shape) => {
			const offsetShape = transform.applyOffsetToShape(shape)
			return transform.roundShape(offsetShape)
		})
		return { ...part, shapes: transformedShapes }
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
