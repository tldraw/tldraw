import {
	assert,
	createShapeId,
	Editor,
	lerp,
	TLArrowShape,
	TLFrameShape,
	TLGeoShape,
} from '@tldraw/editor'
import { ArrowShapeOptions } from '../arrow-types'
import { ArrowShapeUtil } from '../ArrowShapeUtil'
import { createOrUpdateArrowBinding } from '../shared'

const defaultSize = 150
const spacing = 50
const frameSize = spacing * 2 + defaultSize * 3

function getPositions(
	options: ArrowShapeOptions
): Record<string, number | { pos: number; size: number }> {
	assert(options.expandElbowLegLength > options.minElbowLegLength)
	assert(options.expandElbowLegLength * 4 < defaultSize)
	return {
		'fully separated': spacing + defaultSize * 2,
		'between expand & min distance':
			spacing +
			defaultSize +
			lerp(options.minElbowLegLength * 2, options.expandElbowLegLength * 2, 0.5),
		'between min distance & overlap':
			spacing + defaultSize + options.expandElbowLegLength + options.minElbowLegLength / 2,
		'expanded overlaps': spacing + defaultSize + options.expandElbowLegLength / 2,
		'shapes touch': spacing + defaultSize - options.expandElbowLegLength,
		'expanded contains midpoint': spacing + (defaultSize + options.expandElbowLegLength) / 2,
	}
}

export function createDebugElbowArrowScene(editor: Editor) {
	const { options } = editor.getShapeUtil<ArrowShapeUtil>('arrow')
	const positions = Object.entries(getPositions(options))

	const oldShapeIds = []
	for (const id of editor.getCurrentPageShapeIds()) {
		if (editor.getShape(id)?.meta.isFromDebugElbowArrowScene) {
			oldShapeIds.push(id)
		}
	}
	editor.deleteShapes(oldShapeIds)

	for (let xIdx = 0; xIdx < positions.length; xIdx++) {
		const [xLabel, xPos] = positions[xIdx]
		const { pos: x, size: w } = typeof xPos === 'number' ? { pos: xPos, size: defaultSize } : xPos
		for (let yIdx = 0; yIdx < positions.length; yIdx++) {
			const [yLabel, yPos] = positions[yIdx]
			const { pos: y, size: h } = typeof yPos === 'number' ? { pos: yPos, size: defaultSize } : yPos

			const frameId = createShapeId()
			editor.createShape<TLFrameShape>({
				type: 'frame',
				meta: { isFromDebugElbowArrowScene: true },
				id: frameId,
				x: xIdx * (frameSize + spacing),
				y: yIdx * (frameSize + spacing),
				props: {
					w: frameSize,
					h: frameSize,
					name: `x: ${xLabel}; y: ${yLabel}`,
				},
			})

			const shapeAId = createShapeId()
			const shapeBId = createShapeId()

			editor.createShape<TLGeoShape>({
				type: 'geo',
				meta: { isFromDebugElbowArrowScene: true },
				id: shapeAId,
				x: spacing,
				y: spacing,
				parentId: frameId,
				props: {
					w: defaultSize,
					h: defaultSize,
				},
			})

			editor.createShape<TLGeoShape>({
				type: 'geo',
				id: shapeBId,
				x,
				y,
				parentId: frameId,
				props: {
					w,
					h,
				},
			})

			const arrowId = createShapeId()
			editor.createShape<TLArrowShape>({
				type: 'arrow',
				meta: { isFromDebugElbowArrowScene: true },
				id: arrowId,
			})

			createOrUpdateArrowBinding(editor, arrowId, shapeAId, {
				terminal: 'start',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
			})

			createOrUpdateArrowBinding(editor, arrowId, shapeBId, {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
			})
		}
	}
}
