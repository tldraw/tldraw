import { structuredClone } from 'tldraw'
import { convertTldrawShapeToSimpleShape } from '../../shared/format/convertTldrawShapeToSimpleShape'
import { SimpleShape } from '../../shared/format/SimpleShape'
import { SelectedShapesPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { AgentHelpers } from '../AgentHelpers'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const SelectedShapesPartUtil = registerPromptPartUtil(
	class SelectedShapesPartUtil extends PromptPartUtil<SelectedShapesPart> {
		static override type = 'selectedShapes' as const

		override getPart(_request: AgentRequest, helpers: AgentHelpers): SelectedShapesPart {
			if (!this.agent) return { type: 'selectedShapes', shapes: [] }
			const { editor } = this.agent

			const userSelectedShapes = editor.getSelectedShapes().map((v) => structuredClone(v)) ?? []

			const simpleShapes: SimpleShape[] = []
			for (const shape of userSelectedShapes) {
				if (!shape) continue
				const simpleShape = convertTldrawShapeToSimpleShape(editor, shape)
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
)
