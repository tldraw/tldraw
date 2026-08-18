import { Box } from 'tldraw'
import { convertTldrawShapesToPeripheralShapes } from '../../shared/format/convertTldrawShapesToPeripheralShapes'
import { PeripheralShapesPart } from '../../shared/schema/PromptPartDefinitions'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { AgentHelpers } from '../AgentHelpers'
import { PromptPartUtil, registerPromptPartUtil } from './PromptPartUtil'

export const PeripheralShapesPartUtil = registerPromptPartUtil(
	class PeripheralShapesPartUtil extends PromptPartUtil<PeripheralShapesPart> {
		static override type = 'peripheralShapes' as const

		override getPart(request: AgentRequest, helpers: AgentHelpers): PeripheralShapesPart {
			const { editor } = this

			const contextBoundsBox = Box.From(request.bounds)

			// Shapes outside the context bounds are what we want to peripheralize
			const shapesOutsideViewport = editor.getCurrentPageShapesSorted().filter((shape) => {
				const bounds = editor.getShapeMaskedPageBounds(shape)
				return bounds ? !contextBoundsBox.includes(bounds) : false
			})

			const clusters = convertTldrawShapesToPeripheralShapes(editor, shapesOutsideViewport, {
				padding: 75,
			})

			// Apply the offset and round the clusters
			const normalizedClusters = clusters.map((cluster) => ({
				numberOfShapes: cluster.numberOfShapes,
				bounds: helpers.roundBox(helpers.applyOffsetToBox(cluster.bounds)),
			}))

			return {
				type: 'peripheralShapes',
				clusters: normalizedClusters,
			}
		}
	}
)
