import { AgentRequest, CanvasLintsPart } from '@tldraw/fairy-shared'
import { Box } from 'tldraw'
import { PromptPartUtil } from './PromptPartUtil'

export class CanvasLintsPartUtil extends PromptPartUtil<CanvasLintsPart> {
	static override type = 'canvasLints' as const

	override getPart(request: AgentRequest): CanvasLintsPart {
		const { editor, agent } = this
		if (!editor) return { type: 'canvasLints', lints: [] }

		const unsurfacedLints = agent.lints.getUnsurfacedLints()
		if (unsurfacedLints.length > 0) {
			return {
				type: 'canvasLints',
				lints: unsurfacedLints,
			}
		}

		const shapes = editor.getCurrentPageShapesSorted()
		const contextBoundsBox = Box.From(request.bounds)
		const shapesInBounds = shapes.filter((shape) => {
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return false
			return contextBoundsBox.includes(bounds)
		})

		// If in one-shotting mode, use the created shapes, otherwise (for orchestrators) use the shapes in the request bounds
		const lints =
			this.agent.mode.getMode() === 'one-shotting'
				? agent.lints.detectCanvasLints(this.agent.lints.getCreatedShapes())
				: agent.lints.detectCanvasLints(shapesInBounds)

		return {
			type: 'canvasLints',
			lints,
		}
	}
}
