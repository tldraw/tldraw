import {
	assert,
	createShapeId,
	DefaultSizeStyle,
	Editor,
	elbowArrowDebug,
	lerp,
	TLArrowShape,
	TLGeoShape,
	TLTextShape,
} from '@tldraw/editor'
import { ArrowShapeUtil } from '../ArrowShapeUtil'
import { createOrUpdateArrowBinding } from '../shared'
import { ElbowArrowOptions } from './definitions'

const defaultSize = 150

export function createDebugElbowArrowScene(editor: Editor) {
	editor.markHistoryStoppingPoint()
	editor.run(() => {
		const shapeOptions = editor.getShapeUtil<ArrowShapeUtil>('arrow').options
		const size = editor.getStyleForNextShape(DefaultSizeStyle)
		const options: ElbowArrowOptions = {
			expandElbowLegLength: shapeOptions.expandElbowLegLength[size],
			minElbowLegLength: shapeOptions.minElbowLegLength[size],
			minArrowDistanceFromCorner: shapeOptions.minArrowDistanceFromCorner,
		}
		const { aSide, bSide } = elbowArrowDebug.get()

		assert(options.expandElbowLegLength > options.minElbowLegLength)
		assert(options.expandElbowLegLength * 4 < defaultSize)

		const spacing = options.expandElbowLegLength * 2
		const big = defaultSize + options.expandElbowLegLength * 4
		const veryBig = defaultSize + options.expandElbowLegLength * 12
		const positions = Object.entries({
			'fully separated': defaultSize * 2,
			'between expand & min distance':
				defaultSize + lerp(options.minElbowLegLength * 2, options.expandElbowLegLength * 2, 0.5),
			'between min distance & overlap':
				defaultSize + options.expandElbowLegLength + options.minElbowLegLength / 2,
			'expanded overlaps': defaultSize + options.expandElbowLegLength / 2,
			'shapes overlap': defaultSize - options.expandElbowLegLength,
			'expanded contains midpoint': (defaultSize + options.expandElbowLegLength) / 2,
			'shape contains midpoint': defaultSize / 2 - options.expandElbowLegLength,
			'fully contained': { pos: defaultSize * 0.3, size: defaultSize / 2 },
			'expanded before shape': { pos: options.expandElbowLegLength / 2, size: big },
			'shape before shape': { pos: -options.expandElbowLegLength / 2, size: big },
			'shape before expanded': { pos: -options.expandElbowLegLength * 1.5, size: big },
			'very big': { pos: -options.expandElbowLegLength * 1.5, size: veryBig },
		} satisfies Record<string, number | { pos: number; size: number }>)

		const oldShapeIds = []
		for (const id of editor.getCurrentPageShapeIds()) {
			if (editor.getShape(id)?.meta.isFromDebugElbowArrowScene) {
				oldShapeIds.push(id)
			}
		}
		editor.deleteShapes(oldShapeIds)

		let frameX = 0

		for (let xIdx = 0; xIdx < positions.length; xIdx++) {
			const [xLabel, xPos] = positions[xIdx]
			const { pos: x, size: w } = typeof xPos === 'number' ? { pos: xPos, size: defaultSize } : xPos
			const offsetX = spacing - Math.min(0, x)
			const frameWidth = Math.max(offsetX + defaultSize + spacing, offsetX + x + w + spacing)

			let frameY = 0
			for (let yIdx = 0; yIdx < positions.length; yIdx++) {
				const [yLabel, yPos] = positions[yIdx]
				const { pos: y, size: h } =
					typeof yPos === 'number' ? { pos: yPos, size: defaultSize } : yPos

				const offsetY = spacing - Math.min(0, y)
				const frameHeight = Math.max(offsetY + defaultSize + spacing, offsetY + y + h + spacing)

				const wrapperId = createShapeId()
				const labelId = createShapeId()
				editor.createShape<TLGeoShape>({
					type: 'geo',
					meta: { isFromDebugElbowArrowScene: true },
					id: wrapperId,
					x: frameX,
					y: frameY,
					props: {
						w: frameWidth,
						h: frameHeight,
						dash: 'dotted',
					},
				})
				editor.createShape<TLTextShape>({
					type: 'text',
					id: labelId,
					x: 5,
					y: -18,
					parentId: wrapperId,
					props: { text: `x: ${xLabel}; y: ${yLabel}`, size: 's', scale: 0.6 },
				})

				frameY += frameHeight + spacing

				const shapeAId = createShapeId()
				const shapeBId = createShapeId()

				editor.createShape<TLGeoShape>({
					type: 'geo',
					meta: { isFromDebugElbowArrowScene: true },
					id: shapeAId,
					x: offsetX,
					y: offsetY,
					parentId: wrapperId,
					props: {
						w: defaultSize,
						h: defaultSize,
					},
				})

				editor.createShape<TLGeoShape>({
					type: 'geo',
					id: shapeBId,
					x: x + offsetX,
					y: y + offsetY,
					parentId: wrapperId,
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
					side: aSide,
				})

				createOrUpdateArrowBinding(editor, arrowId, shapeBId, {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
					side: bSide,
				})
			}
			frameX += frameWidth + spacing
		}
	})
}
