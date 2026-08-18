import { convertTldrawShapeToBlurryShape } from '../../shared/format/convertTldrawShapeToBlurryShape'
import { BlurryShapesPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { AgentHelpers } from '../AgentHelpers'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const BlurryShapesPartUtil = registerPromptPartUtil(
	class BlurryShapesPartUtil extends PromptPartUtil<BlurryShapesPart> {
		static override type = 'blurryShapes' as const

		override getPart(request: AgentRequest, helpers: AgentHelpers): BlurryShapesPart {
			const blurryShapes = this.getShapesInBounds(request.bounds)
				.map((shape) => convertTldrawShapeToBlurryShape(this.editor, shape))
				.filter((s) => s !== null)

			// Apply the offset and round the blurry shapes
			const normalizedBlurryShapes = blurryShapes.map((shape) => {
				const { x, y, w, h } = helpers.roundBox(helpers.applyOffsetToBox(shape))
				return { ...shape, x, y, w, h }
			})

			return {
				type: 'blurryShapes',
				shapes: normalizedBlurryShapes,
			}
		}
	}
)
