import { Box, Editor, TLShape } from 'tldraw'
import { PeripheralShapeCluster } from './PeripheralShapesCluster'

export function convertTldrawShapesToPeripheralShapes(
	editor: Editor,
	shapes: TLShape[],
	{ padding = 0 }: { padding?: number } = {}
): PeripheralShapeCluster[] {
	const groups: { bounds: Box; numberOfShapes: number }[] = []

	for (const shape of shapes) {
		const bounds = editor.getShapeMaskedPageBounds(shape)!.clone().expandBy(padding)
		const group = groups.find((group) => group.bounds.includes(bounds))
		if (group) {
			group.bounds.expand(bounds)
			group.numberOfShapes++
		} else {
			groups.push({ bounds, numberOfShapes: 1 })
		}
	}

	return groups.map((group) => ({
		bounds: group.bounds.clone().expandBy(-padding),
		numberOfShapes: group.numberOfShapes,
	}))
}
