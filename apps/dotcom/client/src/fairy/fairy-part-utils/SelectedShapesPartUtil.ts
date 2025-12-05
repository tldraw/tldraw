import { AgentRequest, SelectedShapesPart } from '@tldraw/fairy-shared'
import { structuredClone } from 'tldraw'
import { PromptPartUtil } from './PromptPartUtil'

export class SelectedShapesPartUtil extends PromptPartUtil<SelectedShapesPart> {
	static override type = 'selectedShapes' as const

	override getPart(_request: AgentRequest): SelectedShapesPart {
		const { editor } = this

		const userSelectedShapes = editor.getSelectedShapes().map((v) => structuredClone(v)) ?? []

		return {
			type: 'selectedShapes',
			shapeIds: userSelectedShapes.map((shape) => shape.id),
		}
	}
}
