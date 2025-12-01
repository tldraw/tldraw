import {
	AgentRequest,
	convertTldrawShapesToPeripheralShapes,
	PeripheralShapesPart,
} from '@tldraw/fairy-shared'
import { Box } from 'tldraw'
import { AgentHelpers } from '../fairy-agent/AgentHelpers'
import { PromptPartUtil } from './PromptPartUtil'

export class PeripheralShapesPartUtil extends PromptPartUtil<PeripheralShapesPart> {
	static override type = 'peripheralShapes' as const

	override getPart(request: AgentRequest, helpers: AgentHelpers): PeripheralShapesPart {
		const { editor } = this

		const shapes = editor.getCurrentPageShapesSorted()
		const contextBounds = request.bounds

		const contextBoundsBox = Box.From(contextBounds)

		// Get all shapes that are outside the context bounds (these are what we want to peripheralize)
		const shapesOutsideViewport = shapes.filter((shape) => {
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return false
			if (contextBoundsBox.includes(bounds)) return false
			return true
		})

		// Convert the shapes to peripheral shape cluster format
		const clusters = convertTldrawShapesToPeripheralShapes(editor, shapesOutsideViewport, {
			padding: 75,
		})

		// Apply the offset and round the clusters
		const normalizedClusters = clusters.map((cluster) => {
			const offsetBounds = helpers.applyOffsetToBox(cluster.bounds)
			return {
				numberOfShapes: cluster.numberOfShapes,
				bounds: helpers.roundBox(offsetBounds),
			}
		})

		return {
			type: 'peripheralShapes',
			clusters: normalizedClusters,
		}
	}
}
