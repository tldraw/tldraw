import { Box, BoxModel, Editor, TLShape } from 'tldraw'
import { roundBox } from '../AgentTransform'
import { AgentPromptOptions } from '../types/AgentPrompt'
import { PromptPartUtil } from './PromptPartUtil'
import { getWholePageContent } from './getWholePageContent'

export class PeripheralShapesPartUtil extends PromptPartUtil<BoxModel[]> {
	static override type = 'peripheralShapes' as const

	override getPriority() {
		return 65 // peripheral content after viewport shapes (low priority)
	}

	override async getPart(options: AgentPromptOptions) {
		const { editor, request } = options
		const currentPageContent = getWholePageContent({ editor })
		const contextBounds = request.bounds

		const contextBoundsBox = Box.From(contextBounds)

		// Get all shapes that are outside the context bounds (these are what we want to peripheralize)
		const shapesToPeripheralize = currentPageContent.shapes.filter((shape) => {
			const bounds = editor.getShapeMaskedPageBounds(shape)
			if (!bounds) return
			if (contextBoundsBox.includes(bounds)) return
			return true
		})

		const shapes = findPeripheralShapeClusters(editor, shapesToPeripheralize, 75)

		return shapes
	}

	override transformPart(part: BoxModel[]): BoxModel[] | null {
		return part.map((shape) => roundBox(shape))
	}

	override buildContent(peripheralContent: BoxModel[]): string[] {
		if (peripheralContent.length === 0) {
			return []
		}

		return [
			"There are some groups of shapes in your peripheral vision, outside the viewport. You can't make out their details or content. If you want to see their content, you need to get closer. The groups are as follows",
			JSON.stringify(peripheralContent),
		]
	}
}

interface PeripheralShapeCluster extends BoxModel {
	numberOfShapes: number
}

function findPeripheralShapeClusters(
	editor: Editor,
	shapes: TLShape[],
	boundsExpand: number
): PeripheralShapeCluster[] {
	if (shapes.length === 0) return []
	const groups: { shapes: TLShape[]; bounds: Box; numberOfShapes: number }[] = []

	const zoomLevel = editor.getZoomLevel()
	console.log('zoomLevel', zoomLevel)

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
			x: shrunkBounds.x,
			y: shrunkBounds.y,
			w: shrunkBounds.w,
			h: shrunkBounds.h,
			numberOfShapes: group.numberOfShapes,
		}
	})
}
