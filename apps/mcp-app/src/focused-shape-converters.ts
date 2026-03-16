import {
	toRichText,
	type IndexKey,
	type TLBindingCreate,
	type TLParentId,
	type TLShape,
	type TLShapeId,
} from 'tldraw'
import {
	FocusedColorSchema,
	FocusedDashSchema,
	FocusedFontSchema,
	FocusedSizeSchema,
	type FocusedColor,
	type FocusedDash,
	type FocusedFill,
	type FocusedFont,
	type FocusedGeoShapeType,
	type FocusedShape,
	type FocusedSize,
	type FocusedTextAnchor,
} from './focused-shape-schema'

// --- Mapping tables ---

const FOCUSED_TO_GEO_TYPES: Record<FocusedGeoShapeType, string> = {
	rectangle: 'rectangle',
	ellipse: 'ellipse',
	triangle: 'triangle',
	diamond: 'diamond',
	hexagon: 'hexagon',
	pill: 'oval',
	cloud: 'cloud',
	'x-box': 'x-box',
	'check-box': 'check-box',
	heart: 'heart',
	pentagon: 'pentagon',
	octagon: 'octagon',
	star: 'star',
	'parallelogram-right': 'rhombus',
	'parallelogram-left': 'rhombus-2',
	trapezoid: 'trapezoid',
	'fat-arrow-right': 'arrow-right',
	'fat-arrow-left': 'arrow-left',
	'fat-arrow-up': 'arrow-up',
	'fat-arrow-down': 'arrow-down',
	geo: 'rectangle',
}

const FOCUSED_TO_TLDRAW_FILLS: Record<FocusedFill, string> = {
	none: 'none',
	solid: 'lined-fill',
	background: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

const TLDRAW_TO_FOCUSED_FILLS: Record<string, FocusedFill> = {
	none: 'none',
	fill: 'solid',
	'lined-fill': 'solid',
	semi: 'background',
	solid: 'tint',
	pattern: 'pattern',
}

// Build the reverse mapping manually to avoid collisions.
// Multiple focused types map to the same tldraw geo (e.g. both 'rectangle' and 'geo' map to 'rectangle').
// We want the reverse to prefer the specific name (e.g. 'rectangle' -> 'rectangle', not 'geo').
const GEO_TO_FOCUSED_TYPES: Record<string, FocusedGeoShapeType> = {}
for (const [focused, tldraw] of Object.entries(FOCUSED_TO_GEO_TYPES)) {
	// Skip the generic 'geo' alias so specific names win
	if (focused === 'geo') continue
	GEO_TO_FOCUSED_TYPES[tldraw] = focused as FocusedGeoShapeType
}

// --- Helpers ---

function asColor(color: string): FocusedColor {
	if (FocusedColorSchema.safeParse(color).success) return color as FocusedColor
	if (color === 'pink' || color === 'light-pink') return 'light-violet'
	return 'black'
}

function toShapeId(id: string): TLShapeId {
	return (id.startsWith('shape:') ? id : `shape:${id}`) as TLShapeId
}

function toSimpleId(id: string): string {
	return id.replace(/^shape:/, '')
}

function fromRichText(richText: unknown): string {
	if (!richText || typeof richText !== 'object') return ''
	const rt = richText as { content?: unknown[] }
	if (!Array.isArray(rt.content)) return ''

	const extractText = (node: unknown): string => {
		if (!node || typeof node !== 'object') return ''
		const maybeText = (node as { text?: unknown }).text
		if (typeof maybeText === 'string') return maybeText
		const children = (node as { content?: unknown }).content
		if (!Array.isArray(children)) return ''
		return children.map(extractText).join('')
	}

	return rt.content.map(extractText).join('\n')
}

function getMetaNote(record: TLShape): string {
	const note = record.meta.note
	return typeof note === 'string' ? note : ''
}

function normalizeBox(
	x: number,
	y: number,
	w: number,
	h: number
): { x: number; y: number; w: number; h: number } {
	let nextX = x
	let nextY = y
	let nextW = w
	let nextH = h

	if (nextW < 0) {
		nextX += nextW
		nextW = Math.abs(nextW)
	}

	if (nextH < 0) {
		nextY += nextH
		nextH = Math.abs(nextH)
	}

	return {
		x: nextX,
		y: nextY,
		w: Math.max(nextW, 1),
		h: Math.max(nextH, 1),
	}
}

// --- Converters ---

export function convertFocusedShapeToTldrawRecord(shape: FocusedShape): {
	shape: TLShape
	bindings: TLBindingCreate[]
} {
	const base = {
		typeName: 'shape' as const,
		parentId: 'page:page' as TLParentId,
		isLocked: false,
		opacity: 1,
		rotation: 0,
		index: 'a1' as IndexKey,
		meta: {
			note: shape.note ?? '',
		},
	}

	switch (shape._type) {
		case 'text': {
			let textAlign: 'start' | 'middle' | 'end' = 'start'
			if (shape.anchor.includes('center')) textAlign = 'middle'
			if (shape.anchor.includes('right')) textAlign = 'end'

			return {
				shape: {
					...base,
					id: toShapeId(shape.shapeId),
					type: 'text',
					x: shape.x,
					y: shape.y,
					props: {
						richText: toRichText(shape.text),
						color: asColor(shape.color),
						size: shape.size ?? 'm',
						font: shape.font ?? 'draw',
						textAlign,
						autoSize: shape.maxWidth == null,
						w: shape.maxWidth ?? 100,
						scale: 1,
					},
				} as TLShape,
				bindings: [],
			}
		}
		case 'line': {
			const minX = Math.min(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)
			return {
				shape: {
					...base,
					id: toShapeId(shape.shapeId),
					type: 'line',
					x: minX,
					y: minY,
					props: {
						color: asColor(shape.color),
						dash: shape.dash ?? 'draw',
						size: shape.size ?? 'm',
						scale: 1,
						spline: 'line',
						points: {
							a1: {
								id: 'a1',
								index: 'a1' as IndexKey,
								x: shape.x1 - minX,
								y: shape.y1 - minY,
							},
							a2: {
								id: 'a2',
								index: 'a2' as IndexKey,
								x: shape.x2 - minX,
								y: shape.y2 - minY,
							},
						},
					},
				} as TLShape,
				bindings: [],
			}
		}
		case 'arrow': {
			const minX = Math.min(shape.x1, shape.x2)
			const minY = Math.min(shape.y1, shape.y2)
			const arrowShapeId = toShapeId(shape.shapeId)
			const bindings: TLBindingCreate[] = []

			if (shape.fromId) {
				bindings.push({
					type: 'arrow',
					fromId: arrowShapeId,
					toId: toShapeId(shape.fromId),
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: false,
						isPrecise: false,
					},
					meta: {},
				})
			}

			if (shape.toId) {
				bindings.push({
					type: 'arrow',
					fromId: arrowShapeId,
					toId: toShapeId(shape.toId),
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: false,
						isPrecise: false,
					},
					meta: {},
				})
			}

			return {
				shape: {
					...base,
					id: arrowShapeId,
					type: 'arrow',
					x: minX,
					y: minY,
					props: {
						color: asColor(shape.color),
						dash: shape.dash ?? 'draw',
						size: shape.size ?? 'm',
						fill: 'none',
						font: 'draw',
						arrowheadStart: 'none',
						arrowheadEnd: 'arrow',
						start: { x: shape.x1 - minX, y: shape.y1 - minY },
						end: { x: shape.x2 - minX, y: shape.y2 - minY },
						bend: (shape.bend ?? 0) * -1,
						richText: toRichText(shape.text ?? ''),
						labelColor: 'black',
						labelPosition: 0.5,
						scale: 1,
						kind: 'arc',
						elbowMidPoint: 0.5,
					},
				} as TLShape,
				bindings,
			}
		}
		case 'note': {
			return {
				shape: {
					...base,
					id: toShapeId(shape.shapeId),
					type: 'note',
					x: shape.x,
					y: shape.y,
					props: {
						color: asColor(shape.color),
						richText: toRichText(shape.text ?? ''),
						size: shape.size ?? 'm',
						font: shape.font ?? 'draw',
						align: 'middle',
						verticalAlign: 'middle',
						fontSizeAdjustment: 0,
						growY: 0,
						labelColor: 'black',
						scale: 1,
						url: '',
					},
				} as TLShape,
				bindings: [],
			}
		}
		case 'draw': {
			return {
				shape: {
					...base,
					id: toShapeId(shape.shapeId),
					type: 'draw',
					x: 0,
					y: 0,
					props: {
						color: asColor(shape.color),
						dash: 'draw',
						size: 's',
						fill: shape.fill ? (FOCUSED_TO_TLDRAW_FILLS[shape.fill] ?? 'none') : 'none',
						segments: [],
						isClosed: false,
						isComplete: true,
						isPen: false,
						scale: 1,
						scaleX: 1,
						scaleY: 1,
					},
				} as TLShape,
				bindings: [],
			}
		}
		case 'frame': {
			const box = normalizeBox(shape.x, shape.y, shape.w, shape.h)
			return {
				shape: {
					...base,
					id: toShapeId(shape.shapeId),
					type: 'frame',
					x: box.x,
					y: box.y,
					props: {
						w: box.w,
						h: box.h,
						name: shape.name ?? '',
						color: 'black',
					},
				} as TLShape,
				bindings: [],
			}
		}
		case 'unknown': {
			throw new Error(
				`Cannot create unsupported shape type "${shape.subType}" from FocusedShape unknown.`
			)
		}
		default: {
			const geoType = FOCUSED_TO_GEO_TYPES[shape._type] ?? 'rectangle'
			const box = normalizeBox(shape.x, shape.y, shape.w, shape.h)
			return {
				shape: {
					...base,
					id: toShapeId(shape.shapeId),
					type: 'geo',
					x: box.x,
					y: box.y,
					props: {
						geo: geoType,
						w: box.w,
						h: box.h,
						color: asColor(shape.color),
						fill: FOCUSED_TO_TLDRAW_FILLS[shape.fill] ?? 'none',
						dash: shape.dash ?? 'draw',
						size: shape.size ?? 'm',
						font: shape.font ?? 'draw',
						align: shape.textAlign ?? 'middle',
						verticalAlign: 'middle',
						growY: 0,
						richText: toRichText(shape.text ?? ''),
						labelColor: 'black',
						scale: 1,
						url: '',
					},
				} as TLShape,
				bindings: [],
			}
		}
	}
}

/**
 * Batch-convert focused shapes to tldraw records, resolving frame parent–child
 * relationships so callers don't have to.
 */
export function convertFocusedShapesToTldrawRecords(shapes: FocusedShape[]): {
	shapes: TLShape[]
	bindings: TLBindingCreate[]
} {
	const results = shapes.map((s) => convertFocusedShapeToTldrawRecord(s))
	const tldrawShapes = results.map((r) => r.shape)
	const bindings = results.flatMap((r) => r.bindings)

	// Parent children of frames to their frame
	const frames = shapes.filter((s) => s._type === 'frame')
	for (const frame of frames) {
		const frameId = toShapeId(frame.shapeId)

		if (frame.children?.length) {
			// Explicit children list
			for (const childId of frame.children) {
				const child = tldrawShapes.find((r) => r.id === toShapeId(childId))
				if (child) {
					child.parentId = frameId
				}
			}
		} else {
			// Fallback: parent shapes whose center falls within the frame bounds
			const frameRecord = tldrawShapes.find((r) => r.id === frameId)
			if (frameRecord) {
				const fw = (frameRecord.props as any).w ?? 0
				const fh = (frameRecord.props as any).h ?? 0
				for (const record of tldrawShapes) {
					if (record.id === frameId) continue
					if ((record as any).parentId !== 'page:page') continue
					const props = record.props as any
					const sw = props.w ?? 0
					const sh = props.h ?? 0
					const cx = record.x + sw / 2
					const cy = record.y + sh / 2
					if (cx >= 0 && cy >= 0 && cx <= fw && cy <= fh) {
						;(record as any).parentId = frameId
					}
				}
			}
		}
	}

	return { shapes: tldrawShapes, bindings }
}

export function convertTldrawRecordToFocusedShape(record: TLShape): FocusedShape {
	const simpleId = toSimpleId(record.id)

	switch (record.type) {
		case 'geo': {
			const { props } = record
			return {
				_type: GEO_TO_FOCUSED_TYPES[props.geo] ?? 'rectangle',
				shapeId: simpleId,
				x: record.x,
				y: record.y,
				w: props.w ?? 200,
				h: props.h ?? 100,
				color: asColor(props.color ?? 'black'),
				fill: TLDRAW_TO_FOCUSED_FILLS[props.fill] ?? 'none',
				dash: FocusedDashSchema.safeParse(props.dash).success
					? (props.dash as FocusedDash)
					: 'draw',
				size: FocusedSizeSchema.safeParse(props.size).success ? (props.size as FocusedSize) : 'm',
				font: FocusedFontSchema.safeParse(props.font).success
					? (props.font as FocusedFont)
					: 'draw',
				text: fromRichText(props.richText) || undefined,
				textAlign: (props.align as 'start' | 'middle' | 'end' | undefined) ?? 'middle',
				note: getMetaNote(record),
			}
		}
		case 'text': {
			const { props } = record
			const textAlign = props.textAlign ?? 'start'
			const anchor: FocusedTextAnchor =
				textAlign === 'middle' ? 'top-center' : textAlign === 'end' ? 'top-right' : 'top-left'
			return {
				_type: 'text',
				shapeId: simpleId,
				x: record.x,
				y: record.y,
				text: fromRichText(props.richText),
				color: asColor(props.color ?? 'black'),
				anchor,
				size: FocusedSizeSchema.safeParse(props.size).success ? (props.size as FocusedSize) : 'm',
				font: FocusedFontSchema.safeParse(props.font).success
					? (props.font as FocusedFont)
					: 'draw',
				maxWidth: props.autoSize ? null : (props.w ?? 100),
				note: getMetaNote(record),
			}
		}
		case 'arrow': {
			const { props } = record
			const start = props.start ?? { x: 0, y: 0 }
			const end = props.end ?? { x: 0, y: 0 }
			return {
				_type: 'arrow',
				shapeId: simpleId,
				x1: record.x + start.x,
				y1: record.y + start.y,
				x2: record.x + end.x,
				y2: record.y + end.y,
				color: asColor(props.color ?? 'black'),
				dash: FocusedDashSchema.safeParse(props.dash).success
					? (props.dash as FocusedDash)
					: 'draw',
				size: FocusedSizeSchema.safeParse(props.size).success ? (props.size as FocusedSize) : 'm',
				text: fromRichText(props.richText) || undefined,
				bend: props.bend ? props.bend * -1 : undefined,
				fromId: null,
				toId: null,
				note: getMetaNote(record),
			}
		}
		case 'line': {
			const { props } = record
			const a1 = props.points.a1 ?? { x: 0, y: 0 }
			const a2 = props.points.a2 ?? { x: 0, y: 0 }
			return {
				_type: 'line',
				shapeId: simpleId,
				x1: record.x + (a1.x ?? 0),
				y1: record.y + (a1.y ?? 0),
				x2: record.x + (a2.x ?? 0),
				y2: record.y + (a2.y ?? 0),
				color: asColor(props.color ?? 'black'),
				dash: FocusedDashSchema.safeParse(props.dash).success
					? (props.dash as FocusedDash)
					: 'draw',
				size: FocusedSizeSchema.safeParse(props.size).success ? (props.size as FocusedSize) : 'm',
				note: getMetaNote(record),
			}
		}
		case 'note': {
			const { props } = record
			return {
				_type: 'note',
				shapeId: simpleId,
				x: record.x,
				y: record.y,
				color: asColor(props.color ?? 'yellow'),
				size: FocusedSizeSchema.safeParse(props.size).success ? (props.size as FocusedSize) : 'm',
				font: FocusedFontSchema.safeParse(props.font).success
					? (props.font as FocusedFont)
					: 'draw',
				text: fromRichText(props.richText) || undefined,
				note: getMetaNote(record),
			}
		}
		case 'draw': {
			const { props } = record
			return {
				_type: 'draw',
				shapeId: simpleId,
				color: asColor(props.color ?? 'black'),
				fill: TLDRAW_TO_FOCUSED_FILLS[props.fill] ?? 'none',
				note: getMetaNote(record),
			}
		}
		case 'frame': {
			const { props } = record
			return {
				_type: 'frame',
				shapeId: simpleId,
				x: record.x,
				y: record.y,
				w: props.w ?? 500,
				h: props.h ?? 300,
				name: typeof props.name === 'string' ? props.name : undefined,
				note: getMetaNote(record),
			}
		}
		default:
			return {
				_type: 'unknown',
				shapeId: simpleId,
				subType: record.type,
				x: record.x,
				y: record.y,
				note: getMetaNote(record),
			}
	}
}
