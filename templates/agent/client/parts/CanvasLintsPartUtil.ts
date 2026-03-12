import { Box } from 'tldraw'
import { CanvasLintsPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { AgentHelpers } from '../AgentHelpers'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const CanvasLintsPartUtil = registerPromptPartUtil(
	class CanvasLintsPartUtil extends PromptPartUtil<CanvasLintsPart> {
		static override type = 'canvasLints' as const

		override getPart(request: AgentRequest, _helpers: AgentHelpers): CanvasLintsPart {
			const { editor, agent } = this
			if (!editor) return { type: 'canvasLints', lints: [] }

			const shapes = editor.getCurrentPageShapesSorted()
			const contextBoundsBox = Box.From(request.bounds)
			const shapesInBounds = shapes.filter((shape) => {
				const bounds = editor.getShapeMaskedPageBounds(shape)
				if (!bounds) return false
				return contextBoundsBox.includes(bounds)
			})

			// Use created shapes when in working mode, otherwise use shapes in request bounds
			const shapesToCheck =
				agent.mode.getCurrentModeType() === 'working'
					? agent.lints.getCreatedShapes()
					: shapesInBounds

			// Get unsurfaced lints and mark them as surfaced
			const lints = agent.lints.getUnsurfacedLintsForShapes(shapesToCheck)
			agent.lints.markLintsAsSurfaced(lints)

			return {
				type: 'canvasLints',
				lints,
			}
		}
	}
)
