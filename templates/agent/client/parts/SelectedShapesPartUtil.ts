import { structuredClone } from 'tldraw'
import { convertTldrawIdToSimpleId } from '../../shared/format/convertTldrawShapeToFocusedShape'
import { SelectedShapesPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const SelectedShapesPartUtil = registerPromptPartUtil(
	class SelectedShapesPartUtil extends PromptPartUtil<SelectedShapesPart> {
		static override type = 'selectedShapes' as const

		override getPart(_request: AgentRequest): SelectedShapesPart {
			const { editor } = this

			const userSelectedShapes = editor.getSelectedShapes().map((v) => structuredClone(v)) ?? []

			return {
				type: 'selectedShapes',
				shapeIds: userSelectedShapes.map((shape) => convertTldrawIdToSimpleId(shape.id)),
			}
		}
	}
)
