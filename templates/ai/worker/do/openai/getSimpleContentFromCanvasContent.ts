import { TLAiContent } from '@tldraw/ai'
import {
	TLArrowBinding,
	TLArrowShape,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLTextShape,
} from 'tldraw'
import { shapeFillToSimpleFill } from './conversions'
import { ISimpleShape } from './schema'

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
						type: 'text',
						text: s.props.richText,
						x: s.x,
						y: s.y,
						color: s.props.color,
						textAlign: s.props.textAlign,
						note: (s.meta?.description as string) ?? '',
					}
				}

				if (shape.type === 'geo') {
					const s = shape as TLGeoShape
					if (s.props.geo === 'rectangle' || s.props.geo === 'ellipse' || s.props.geo === 'cloud') {
						return {
							shapeId: s.id,
							type: s.props.geo,
							x: s.x,
							y: s.y,
							width: s.props.w,
							height: s.props.h,
							color: s.props.color,
							fill: shapeFillToSimpleFill(s.props.fill),
							text: s.props.richText,
							note: (s.meta?.description as string) ?? '',
						}
					}
				}

				if (shape.type === 'line') {
					const s = shape as TLLineShape
					const points = Object.values(s.props.points).sort((a, b) =>
						a.index.localeCompare(b.index)
					)
					return {
						shapeId: s.id,
						type: 'line',
						x1: points[0].x + s.x,
						y1: points[0].y + s.y,
						x2: points[1].x + s.x,
						y2: points[1].y + s.y,
						color: s.props.color,
						note: (s.meta?.description as string) ?? '',
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
						shapeId: s.id,
						type: 'arrow',
						fromId: startBinding?.toId ?? null,
						toId: endBinding?.toId ?? null,
						x1: s.props.start.x,
						y1: s.props.start.y,
						x2: s.props.end.x,
						y2: s.props.end.y,
						color: s.props.color,
						text: s.props.text,
						note: (s.meta?.description as string) ?? '',
					}
				}

				if (shape.type === 'note') {
					const s = shape as TLNoteShape
					return {
						shapeId: s.id,
						type: 'note',
						x: s.x,
						y: s.y,
						color: s.props.color,
						text: s.props.richText,
						note: (s.meta?.description as string) ?? '',
					}
				}

				// Any other shape is unknown
				return {
					shapeId: shape.id,
					type: 'unknown',
					note: (shape.meta?.description as string) ?? '',
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
