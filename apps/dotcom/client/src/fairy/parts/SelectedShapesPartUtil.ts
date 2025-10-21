import {
	AgentRequest,
	convertTldrawShapeToFocusedShape,
	FocusedShape,
	SelectedShapesPart,
} from '@tldraw/fairy-shared'
import { structuredClone } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class SelectedShapesPartUtil extends PromptPartUtil<SelectedShapesPart> {
	static override type = 'selectedShapes' as const

	override getPart(_request: AgentRequest, helpers: AgentHelpers): SelectedShapesPart {
		const { editor } = this

		const userSelectedShapes = editor.getSelectedShapes().map((v) => structuredClone(v)) ?? []

		const simpleShapes: FocusedShape[] = []
		for (const shape of userSelectedShapes) {
			if (!shape) continue
			const simpleShape = convertTldrawShapeToFocusedShape(editor, shape)
			if (simpleShape) {
				simpleShapes.push(simpleShape)
			}
		}

		const normalizedSimpleShapes = simpleShapes.map((shape) => {
			const offsetShape = helpers.applyOffsetToShape(shape)
			return helpers.roundShape(offsetShape)
		})

		return {
			type: 'selectedShapes',
			shapes: normalizedSimpleShapes,
		}
	}
}
