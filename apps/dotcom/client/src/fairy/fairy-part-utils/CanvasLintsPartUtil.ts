import { AgentRequest, CanvasLintsPart } from '@tldraw/fairy-shared'
import { Box } from 'tldraw'
import { PromptPartUtil } from './PromptPartUtil'

export class CanvasLintsPartUtil extends PromptPartUtil<CanvasLintsPart> {
	static override type = 'canvasLints' as const

	override getPart(request: AgentRequest): CanvasLintsPart {
		const { editor, agent } = this
		if (!editor) return { type: 'canvasLints', lints: [] }

		const shapes = editor.getCurrentPageShapesSorted()
		const contextBoundsBox = Box.From(request.bounds)
		const shapesInBounds = shapes.filter((shape) => {
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return false
			return contextBoundsBox.includes(bounds)
		})

		// If in one-shotting mode, use the created shapes, otherwise (for orchestrators) use the shapes in the request bounds (ie, the bounds of the task they'll be reviewing)
		const shapesToCheck =
			this.agent.mode.getMode() === 'one-shotting' ? agent.lints.getCreatedShapes() : shapesInBounds

		// Get unsurfaced lints and mark them as surfaced
		const lints = agent.lints.getUnsurfacedLintsForShapes(shapesToCheck)
		agent.lints.markLintsAsSurfaced(lints)

		return {
			type: 'canvasLints',
			lints,
		}
	}
}
