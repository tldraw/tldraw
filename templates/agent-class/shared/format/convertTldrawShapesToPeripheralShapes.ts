import { Box, Editor, TLShape } from 'tldraw'
import { PeripheralShapeCluster } from './PeripheralShapesCluster'

export function convertTldrawShapesToPeripheralShapes(
	editor: Editor,
	shapes: TLShape[],
	{ padding = 0 }: { padding?: number } = {}
): PeripheralShapeCluster[] {
	if (shapes.length === 0) return []
	const groups: { shapes: TLShape[]; bounds: Box; numberOfShapes: number }[] = []

	const expandedBounds = shapes.map((shape) => {
		return {
			shape,
			bounds: editor.getShapeMaskedPageBounds(shape)!.clone().expandBy(padding),
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
		const shrunkBounds = group.bounds.clone().expandBy(-padding)
		return {
			bounds: shrunkBounds,
			numberOfShapes: group.numberOfShapes,
		}
	})
}
