import { Box, BoxModel, Editor, TLShape } from 'tldraw'
import { TldrawAgent } from '../../client/agent/TldrawAgent'
import { AgentTransform } from '../AgentTransform'
import { AgentRequest } from '../types/AgentRequest'
import { BasePromptPart } from '../types/BasePromptPart'
import { PromptPartUtil } from './PromptPartUtil'

export interface PeripheralShapesPart extends BasePromptPart<'peripheralShapes'> {
	clusters: PeripheralShapeCluster[]
}

export interface PeripheralShapeCluster {
	bounds: BoxModel
	numberOfShapes: number
}

export class PeripheralShapesPartUtil extends PromptPartUtil<PeripheralShapesPart> {
	static override type = 'peripheralShapes' as const

	override getPriority() {
		return 65 // peripheral content after viewport shapes (low priority)
	}

	override getPart(request: AgentRequest, agent: TldrawAgent): PeripheralShapesPart {
		const { editor } = agent
		const shapes = editor.getCurrentPageShapesSorted()
		const contextBounds = request.bounds

		const contextBoundsBox = Box.From(contextBounds)

		// Get all shapes that are outside the context bounds (these are what we want to peripheralize)
		const shapesToPeripheralize = shapes.filter((shape) => {
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return
			if (contextBoundsBox.includes(bounds)) return
			return true
		})

		const clusters = findPeripheralShapeClusters(editor, shapesToPeripheralize, 75)
		return {
			type: 'peripheralShapes',
			clusters,
		}
	}

	override transformPart(
		part: PeripheralShapesPart,
		transform: AgentTransform
	): PeripheralShapesPart | null {
		const clusters = part.clusters.map((cluster) => {
			const offsetBounds = transform.applyOffsetToBox(cluster.bounds)
			return {
				numberOfShapes: cluster.numberOfShapes,
				bounds: transform.roundBox(offsetBounds),
			}
		})
		return { ...part, clusters }
	}

	override buildContent({ clusters }: PeripheralShapesPart): string[] {
		if (clusters.length === 0) {
			return []
		}

		return [
			"There are some groups of shapes in your peripheral vision, outside the your main view. You can't make out their details or content. If you want to see their content, you need to get closer. The groups are as follows",
			JSON.stringify(clusters),
		]
	}
}

function findPeripheralShapeClusters(
	editor: Editor,
	shapes: TLShape[],
	boundsExpand: number
): PeripheralShapeCluster[] {
	if (shapes.length === 0) return []
	const groups: { shapes: TLShape[]; bounds: Box; numberOfShapes: number }[] = []

	const expandedBounds = shapes.map((shape) => {
		return {
			shape,
			bounds: editor.getShapeMaskedPageBounds(shape)!.clone().expandBy(boundsExpand),
		}
	})
	for (let i = 0; i < expandedBounds.length; i++) {
		const item = expandedBounds[i]
		if (i === 0) {
			groups[0] = {
				shapes: [item.shape],
				bounds: item.bounds,
				numberOfShapes: 1,
			}
			continue
		}
		let didLand = false
		for (const group of groups) {
			if (group.bounds.includes(item.bounds)) {
				group.shapes.push(item.shape)
				group.bounds.expand(item.bounds)
				group.numberOfShapes++
				didLand = true
				break
			}
		}
		if (!didLand) {
			groups.push({
				shapes: [item.shape],
				bounds: item.bounds,
				numberOfShapes: 1,
			})
		}
	}

	return groups.map((group) => {
		const shrunkBounds = group.bounds.clone().expandBy(-boundsExpand)
		return {
			bounds: shrunkBounds,
			numberOfShapes: group.numberOfShapes,
		}
	})
}
