import { Box } from 'tldraw'
import { AgentHelpers } from '../AgentHelpers'
import { convertTldrawShapesToPeripheralShapes } from '../format/convertTldrawShapesToPeripheralShapes'
import { PeripheralShapeCluster } from '../format/PeripheralShapesCluster'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface PeripheralShapesPart extends BasePromptPart<'peripheralShapes'> {
	clusters: PeripheralShapeCluster[] | null
}

export class PeripheralShapesPartUtil extends PromptPartUtil<PeripheralShapesPart> {
	static override type = 'peripheralShapes' as const

	override getPriority() {
		return 65 // peripheral content after viewport shapes (low priority)
	}

	override getPart(request: AgentRequest, helpers: AgentHelpers): PeripheralShapesPart {
		if (!this.agent) return { type: 'peripheralShapes', clusters: null }
		const { editor } = this.agent

		const shapes = editor.getCurrentPageShapesSorted()
		const contextBounds = request.bounds

		const contextBoundsBox = Box.From(contextBounds)

		// Get all shapes that are outside the context bounds (these are what we want to peripheralize)
		const shapesOutsideViewport = shapes.filter((shape) => {
			if (!editor) return false
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return
			if (contextBoundsBox.includes(bounds)) return
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

	override buildContent({ clusters }: PeripheralShapesPart): string[] {
		if (!clusters || clusters.length === 0) {
			return []
		}

		return [
			"There are some groups of shapes in your peripheral vision, outside the your main view. You can't make out their details or content. If you want to see their content, you need to get closer. The groups are as follows",
			JSON.stringify(clusters),
		]
	}
}
