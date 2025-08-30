import { Editor, structuredClone } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { convertTldrawShapeToSimpleShape, ISimpleShape } from '../format/SimpleShape'
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

	override getPart(editor: Editor): SelectedShapesPart {
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

	override transformPart(part: SelectedShapesPart, transform: AgentTransform) {
		const transformedShapes = part.shapes
			.map((shape) => transform.roundShape(shape))
			.filter((shape): shape is ISimpleShape => shape !== null)
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
