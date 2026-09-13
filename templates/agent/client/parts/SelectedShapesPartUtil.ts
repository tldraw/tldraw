import { convertTldrawIdToSimpleId } from '../../shared/format/convertTldrawShapeToFocusedShape'
import { SelectedShapesPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const SelectedShapesPartUtil = registerPromptPartUtil(
	class SelectedShapesPartUtil extends PromptPartUtil<SelectedShapesPart> {
		static override type = 'selectedShapes' as const

		override getPart(_request: AgentRequest): SelectedShapesPart {
			return {
				type: 'selectedShapes',
				shapeIds: this.editor.getSelectedShapeIds().map(convertTldrawIdToSimpleId),
			}
		}
	}
)
