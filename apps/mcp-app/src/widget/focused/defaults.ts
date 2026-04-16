/**
 * Default shape templates for creating new shapes from focused format.
 * Extracted from tldraw-internal desktop app handlers.ts.
 */
import { createShapeId, IndexKey, TLShape, toRichText } from 'tldraw'
import { FOCUSED_TO_GEO_TYPES, type FocusedShape } from './format'

export function getDefaultShape(shapeType: FocusedShape['_type']): Partial<TLShape> {
	const isGeo = shapeType in FOCUSED_TO_GEO_TYPES
	if (isGeo) {
		return {
			isLocked: false,
			opacity: 1,
			rotation: 0,
			meta: {},
			id: createShapeId(),
			props: {
				align: 'middle',
				color: 'black',
				dash: 'draw',
				fill: 'none',
				font: 'draw',
				geo: 'rectangle',
				growY: 0,
				h: 200,
				labelColor: 'black',
				richText: toRichText(''),
				scale: 1,
				size: 'm',
				url: '',
				verticalAlign: 'middle',
				w: 200,
			},
		} as any
	}

	switch (shapeType) {
		case 'text':
			return {
				isLocked: false,
				opacity: 1,
				rotation: 0,
				meta: {},
				id: createShapeId(),
				props: {
					autoSize: true,
					color: 'black',
					font: 'draw',
					richText: toRichText(''),
					scale: 1,
					size: 'm',
					textAlign: 'start',
					w: 100,
				},
			} as any
		case 'line':
			return {
				isLocked: false,
				opacity: 1,
				rotation: 0,
				meta: {},
				id: createShapeId(),
				props: {
					size: 'm',
					color: 'black',
					dash: 'draw',
					points: {
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 100, y: 0 },
					},
					scale: 1,
					spline: 'line',
				},
			} as any
		case 'arrow':
			return {
				isLocked: false,
				opacity: 1,
				rotation: 0,
				meta: {},
				id: createShapeId(),
				props: {
					arrowheadEnd: 'arrow',
					arrowheadStart: 'none',
					bend: 0,
					color: 'black',
					dash: 'draw',
					elbowMidPoint: 0.5,
					end: { x: 100, y: 0 },
					fill: 'none',
					font: 'draw',
					kind: 'arc',
					labelColor: 'black',
					labelPosition: 0.5,
					richText: toRichText(''),
					scale: 1,
					size: 'm',
					start: { x: 0, y: 0 },
				},
			} as any
		case 'note':
			return {
				isLocked: false,
				opacity: 1,
				rotation: 0,
				meta: {},
				id: createShapeId(),
				props: {
					color: 'black',
					richText: toRichText(''),
					size: 'm',
					align: 'middle',
					font: 'draw',
					fontSizeAdjustment: 0,
					growY: 0,
					labelColor: 'black',
					scale: 1,
					url: '',
					verticalAlign: 'middle',
				},
			} as any
		case 'draw':
			return {
				isLocked: false,
				opacity: 1,
				rotation: 0,
				meta: {},
				id: createShapeId(),
				props: {},
			} as any
		default:
			return {
				isLocked: false,
				opacity: 1,
				rotation: 0,
				meta: {},
				id: createShapeId(),
				props: {},
			} as any
	}
}
