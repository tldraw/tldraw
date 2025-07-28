import { TLAiContent } from '@tldraw/ai'
import {
	TLArrowBinding,
	TLArrowShape,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLShape,
	TLTextShape,
} from 'tldraw'
import { shapeFillToSimpleFill } from './conversions'
import { ISimplePeripheralShape, ISimpleShape } from './schema'

export function getSimpleContentFromCanvasContent(content: TLAiContent): {
	shapes: ISimpleShape[]
} {
	return {
		shapes: compact(
			content.shapes.map((shape) => {
				if (shape.type === 'text') {
					const s = shape as TLTextShape
					return {
						shapeId: s.id,
						_type: 'text',
						text: (s.meta?.text as string) ?? '',
						x: s.x,
						y: s.y,
						color: s.props.color,
						// textAlign: s.props.textAlign,
						note: (s.meta?.note as string) ?? '',
					}
				}

				if (shape.type === 'geo') {
					const s = shape as TLGeoShape
					if (
						s.props.geo === 'rectangle' ||
						s.props.geo === 'ellipse' ||
						s.props.geo === 'cloud' ||
						s.props.geo === 'triangle' ||
						s.props.geo === 'diamond' ||
						s.props.geo === 'hexagon' ||
						s.props.geo === 'oval' ||
						s.props.geo === 'x-box' ||
						s.props.geo === 'pentagon' ||
						s.props.geo === 'octagon' ||
						s.props.geo === 'star' ||
						s.props.geo === 'rhombus' ||
						s.props.geo === 'rhombus-2' ||
						s.props.geo === 'trapezoid' ||
						s.props.geo === 'arrow-right' ||
						s.props.geo === 'arrow-left' ||
						s.props.geo === 'arrow-up' ||
						s.props.geo === 'arrow-down' ||
						s.props.geo === 'check-box' ||
						s.props.geo === 'heart'
					) {
						return {
							shapeId: s.id,
							_type: s.props.geo as any,
							x: s.x,
							y: s.y,
							width: s.props.w,
							height: s.props.h,
							color: s.props.color,
							fill: shapeFillToSimpleFill(s.props.fill),
							text: (s.meta?.text as string) ?? '',
							note: (s.meta?.note as string) ?? '',
						}
					}
				}

				if (shape.type === 'line') {
					const s = shape as TLLineShape
					const points = Object.values(s.props.points).sort((a, b) =>
						a.index.localeCompare(b.index)
					)
					return {
						_type: 'line',
						color: s.props.color,
						note: (s.meta?.note as string) ?? '',
						shapeId: s.id,
						x1: points[0].x + s.x,
						x2: points[1].x + s.x,
						y1: points[0].y + s.y,
						y2: points[1].y + s.y,
					}
				}

				if (shape.type === 'arrow') {
					const s = shape as TLArrowShape
					const { bindings = [] } = content
					const arrowBindings = bindings.filter(
						(b) => b.type === 'arrow' && b.fromId === s.id
					) as TLArrowBinding[]
					const startBinding = arrowBindings.find((b) => b.props.terminal === 'start')
					const endBinding = arrowBindings.find((b) => b.props.terminal === 'end')

					return {
						_type: 'arrow',
						color: s.props.color,
						fromId: startBinding?.toId ?? null,
						shapeId: s.id,
						text: (s.meta?.text as string) ?? '',
						toId: endBinding?.toId ?? null,
						note: (s.meta?.note as string) ?? '',
						x1: s.props.start.x + s.x,
						x2: s.props.end.x + s.x,
						y1: s.props.start.y + s.y,
						y2: s.props.end.y + s.y,
					}
				}

				if (shape.type === 'note') {
					const s = shape as TLNoteShape
					return {
						shapeId: s.id,
						_type: 'note',
						x: s.x,
						y: s.y,
						color: s.props.color,
						text: (s.meta?.text as string) ?? '',
						note: (s.meta?.note as string) ?? '',
					}
				}

				// Any other shape is unknown
				return {
					shapeId: shape.id,
					_type: 'unknown',
					note: (shape.meta?.note as string) ?? '',
					x: shape.x,
					y: shape.y,
				}
			})
		),
	}
}

function compact<T>(arr: T[]): Exclude<T, undefined>[] {
	return arr.filter(Boolean) as Exclude<T, undefined>[]
}

export function getSimplePeripheralContentFromCanvasContent(
	wholePageShapes: TLShape[],
	viewportContent: TLAiContent
): {
	shapes: ISimplePeripheralShape[]
} {
	const simpleViewportContent = getSimpleContentFromCanvasContent(viewportContent)
	const simpleWholePageContent = getSimpleContentFromCanvasContent({
		shapes: wholePageShapes,
		bindings: [],
		assets: [],
	})

	const wholePageLessViewportContent = simpleWholePageContent.shapes.filter(
		(shape) => !simpleViewportContent.shapes.some((s) => s.shapeId === shape.shapeId)
	)

	const peripheralContentWithIds = wholePageLessViewportContent.map((shape) => {
		// Handle different shape types
		if (shape._type === 'line') {
			// For lines, use the bounding box
			const minX = Math.min(shape.x1, shape.x2)
			const maxX = Math.max(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)
			const maxY = Math.max(shape.y1, shape.y2)

			return {
				h: Math.round(maxY - minY),
				shapeId: shape.shapeId,
				w: Math.round(maxX - minX),
				x: Math.round(minX),
				y: Math.round(minY),
			}
		}

		if (shape._type === 'arrow') {
			// For arrows, use the bounding box
			const minX = Math.min(shape.x1, shape.x2)
			const maxX = Math.max(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)
			const maxY = Math.max(shape.y1, shape.y2)

			return {
				h: Math.round(maxY - minY),
				shapeId: shape.shapeId,
				w: Math.round(maxX - minX),
				x: Math.round(minX),
				y: Math.round(minY),
			}
		}

		if (shape._type === 'note' || shape._type === 'text' || shape._type === 'unknown') {
			// For shapes without dimensions, use default size
			return {
				h: 100, // default height
				shapeId: shape.shapeId,
				w: 100, // default width
				x: Math.round(shape.x),
				y: Math.round(shape.y),
			}
		}

		// For all other shapes (rectangle, ellipse, etc.), use their actual dimensions
		return {
			h: Math.round(shape.height ?? 100), // fallback for optional height (rhombus)
			shapeId: shape.shapeId,
			w: Math.round(shape.width ?? 100), // fallback for optional width (rhombus)
			x: Math.round(shape.x),
			y: Math.round(shape.y),
		}
	})

	const peripheralContent = peripheralContentWithIds.map(({ shapeId: _shapeId, ...rest }) => rest)

	return {
		shapes: peripheralContent,
	}
}
