import {
	Editor,
	FONT_FAMILIES,
	FONT_SIZES,
	IndexKey,
	TEXT_PROPS,
	TLArrowShape,
	TLBindingCreate,
	TLDefaultShape,
	TLDrawShape,
	TLGeoShape,
	TLGeoShapeGeoStyle,
	TLLineShape,
	TLNoteShape,
	TLShape,
	TLShapeId,
	TLTextShape,
	toRichText,
	Vec,
	VecLike,
} from 'tldraw'
import { asColor } from './SimpleColor'
import { convertSimpleFillToTldrawFill } from './SimpleFill'
import { convertSimpleFontSizeToTldrawFontSizeAndScale } from './SimpleFontSize'
import { SimpleGeoShapeType } from './SimpleGeoShapeType'
import {
	SimpleArrowShape,
	SimpleDrawShape,
	SimpleGeoShape,
	SimpleLineShape,
	SimpleNoteShape,
	SimpleShape,
	SimpleTextShape,
	SimpleUnknownShape,
} from './SimpleShape'

/**
 * Convert a SimpleShape to a shape object to a tldraw shape using defaultShape for fallback values
 * @param editor - The tldraw editor instance
 * @param simpleShape - The simple shape to convert
 * @param defaultShape - The default shape to use for fallback values
 * @returns The converted shape and bindings
 */
export function convertSimpleShapeToTldrawShape(
	editor: Editor,
	simpleShape: SimpleShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape; bindings?: TLBindingCreate[] } {
	switch (simpleShape._type) {
		case 'text': {
			return convertTextShapeToTldrawShape(editor, simpleShape, { defaultShape })
		}
		case 'line': {
			return convertLineShapeToTldrawShape(editor, simpleShape, { defaultShape })
		}
		case 'arrow': {
			return convertArrowShapeToTldrawShape(editor, simpleShape, { defaultShape })
		}
		case 'cloud':
		case 'rectangle':
		case 'triangle':
		case 'diamond':
		case 'hexagon':
		case 'pill':
		case 'x-box':
		case 'pentagon':
		case 'octagon':
		case 'star':
		case 'parallelogram-right':
		case 'parallelogram-left':
		case 'trapezoid':
		case 'fat-arrow-right':
		case 'fat-arrow-left':
		case 'fat-arrow-up':
		case 'fat-arrow-down':
		case 'check-box':
		case 'heart':
		case 'ellipse': {
			return convertGeoShapeToTldrawShape(editor, simpleShape, { defaultShape })
		}
		case 'note': {
			return convertNoteShapeToTldrawShape(editor, simpleShape, { defaultShape })
		}
		case 'draw': {
			return convertDrawShapeToTldrawShape(editor, simpleShape, { defaultShape })
		}
		case 'unknown': {
			return convertUnknownShapeToTldrawShape(editor, simpleShape, { defaultShape })
		}
	}
}

export function convertSimpleIdToTldrawId(id: string): TLShapeId {
	return ('shape:' + id) as TLShapeId
}

export function convertSimpleTypeToTldrawType(
	type: SimpleShape['_type']
): TLGeoShapeGeoStyle | TLDefaultShape['type'] | 'unknown' {
	if (type in SIMPLE_TO_GEO_TYPES) {
		return convertSimpleGeoTypeToTldrawGeoGeoType(type as SimpleGeoShapeType) as TLGeoShapeGeoStyle
	}
	return type as TLDefaultShape['type'] | 'unknown'
}

export function convertSimpleGeoTypeToTldrawGeoGeoType(
	type: SimpleGeoShapeType
): TLGeoShapeGeoStyle {
	return SIMPLE_TO_GEO_TYPES[type]
}

export const SIMPLE_TO_GEO_TYPES: Record<SimpleGeoShapeType, TLGeoShapeGeoStyle> = {
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
} as const

function convertTextShapeToTldrawShape(
	editor: Editor,
	simpleShape: SimpleTextShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(simpleShape.shapeId)
	const defaultTextShape = defaultShape as TLTextShape

	// Determine the base font size and scale - simpleShape takes priority
	let textSize: keyof typeof FONT_SIZES = 's'
	let scale = 1

	if (simpleShape.fontSize) {
		const { textSize: calculatedTextSize, scale: calculatedScale } =
			convertSimpleFontSizeToTldrawFontSizeAndScale(simpleShape.fontSize)
		textSize = calculatedTextSize
		scale = calculatedScale
	} else if (defaultTextShape.props?.size) {
		textSize = defaultTextShape.props.size
		scale = defaultTextShape.props.scale ?? 1
	}

	const autoSize =
		simpleShape.wrap === undefined ? (defaultTextShape.props?.autoSize ?? true) : !simpleShape.wrap
	const textFontSize = FONT_SIZES[textSize]
	const textAlign = simpleShape.textAlign ?? defaultTextShape.props?.textAlign ?? 'start'
	const font = defaultTextShape.props?.font ?? 'draw'

	const correctedTextCoords = new Vec()

	const effectiveFontSize = textFontSize * scale

	const measurement = editor.textMeasure.measureText(simpleShape.text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font as keyof typeof FONT_FAMILIES],
		fontSize: effectiveFontSize,
		maxWidth: simpleShape.width ?? Infinity,
	})

	// Calculate position based on text alignment
	const baseX = simpleShape.x ?? defaultTextShape.x ?? 0
	const baseY = simpleShape.y ?? defaultTextShape.y ?? 0

	switch (textAlign) {
		case 'start':
			correctedTextCoords.x = baseX
			correctedTextCoords.y = baseY - measurement.h / 2
			break
		case 'middle':
			correctedTextCoords.x = baseX - measurement.w / 2
			correctedTextCoords.y = baseY - measurement.h / 2
			break
		case 'end':
			correctedTextCoords.x = baseX - measurement.w
			correctedTextCoords.y = baseY - measurement.h / 2
			break
	}

	return {
		shape: {
			id: shapeId,
			type: 'text',
			typeName: 'shape',
			x: correctedTextCoords.x,
			y: correctedTextCoords.y,
			rotation: defaultTextShape.rotation ?? 0,
			index: defaultTextShape.index ?? ('a1' as IndexKey),
			parentId: defaultTextShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultTextShape.isLocked ?? false,
			opacity: defaultTextShape.opacity ?? 1,
			props: {
				size: textSize,
				scale,
				richText: toRichText(simpleShape.text),
				color: asColor(simpleShape.color ?? defaultTextShape.props?.color ?? 'black'),
				textAlign,
				autoSize,
				w: measurement.w,
				font,
			},
			meta: {
				note: simpleShape.note ?? defaultTextShape.meta?.note ?? '',
			},
		},
	}
}

function convertLineShapeToTldrawShape(
	editor: Editor,
	simpleShape: SimpleLineShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(simpleShape.shapeId)
	const defaultLineShape = defaultShape as TLLineShape

	const x1 = simpleShape.x1 ?? 0
	const y1 = simpleShape.y1 ?? 0
	const x2 = simpleShape.x2 ?? 0
	const y2 = simpleShape.y2 ?? 0
	const minX = Math.min(x1, x2)
	const minY = Math.min(y1, y2)

	return {
		shape: {
			id: shapeId,
			type: 'line',
			typeName: 'shape',
			x: minX,
			y: minY,
			rotation: defaultLineShape.rotation ?? 0,
			index: defaultLineShape.index ?? ('a1' as IndexKey),
			parentId: defaultLineShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultLineShape.isLocked ?? false,
			opacity: defaultLineShape.opacity ?? 1,
			props: {
				size: defaultLineShape.props?.size ?? 's',
				points: {
					a1: {
						id: 'a1',
						index: 'a1' as IndexKey,
						x: x1 - minX,
						y: y1 - minY,
					},
					a2: {
						id: 'a2',
						index: 'a2' as IndexKey,
						x: x2 - minX,
						y: y2 - minY,
					},
				},
				color: asColor(simpleShape.color ?? defaultLineShape.props?.color ?? 'black'),
				dash: defaultLineShape.props?.dash ?? 'draw',
				scale: defaultLineShape.props?.scale ?? 1,
				spline: defaultLineShape.props?.spline ?? 'line',
			},
			meta: {
				note: simpleShape.note ?? defaultLineShape.meta?.note ?? '',
			},
		},
	}
}

function convertArrowShapeToTldrawShape(
	editor: Editor,
	simpleShape: SimpleArrowShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape; bindings?: TLBindingCreate[] } {
	const shapeId = convertSimpleIdToTldrawId(simpleShape.shapeId)
	const defaultArrowShape = defaultShape as TLArrowShape

	const x1 = simpleShape.x1 ?? defaultArrowShape.props?.start?.x ?? 0
	const y1 = simpleShape.y1 ?? defaultArrowShape.props?.start?.y ?? 0
	const x2 = simpleShape.x2 ?? defaultArrowShape.props?.end?.x ?? 0
	const y2 = simpleShape.y2 ?? defaultArrowShape.props?.end?.y ?? 0
	const minX = Math.min(x1, x2)
	const minY = Math.min(y1, y2)

	// Handle richText properly - simpleShape takes priority
	let richText
	if (simpleShape.text !== undefined) {
		richText = toRichText(simpleShape.text)
	} else if (defaultArrowShape.props?.richText) {
		richText = defaultArrowShape.props.richText
	} else {
		richText = toRichText('')
	}

	const shape = {
		id: shapeId,
		type: 'arrow' as const,
		typeName: 'shape' as const,
		x: minX,
		y: minY,
		rotation: defaultArrowShape.rotation ?? 0,
		index: defaultArrowShape.index ?? ('a1' as IndexKey),
		parentId: defaultArrowShape.parentId ?? editor.getCurrentPageId(),
		isLocked: defaultArrowShape.isLocked ?? false,
		opacity: defaultArrowShape.opacity ?? 1,
		props: {
			arrowheadEnd: defaultArrowShape.props?.arrowheadEnd ?? 'arrow',
			arrowheadStart: defaultArrowShape.props?.arrowheadStart ?? 'none',
			bend: simpleShape.bend ?? defaultArrowShape.props?.bend ?? 0,
			color: asColor(simpleShape.color ?? defaultArrowShape.props?.color ?? 'black'),
			dash: defaultArrowShape.props?.dash ?? 'draw',
			elbowMidPoint: defaultArrowShape.props?.elbowMidPoint ?? 0.5,
			end: { x: x2 - minX, y: y2 - minY },
			fill: defaultArrowShape.props?.fill ?? 'none',
			font: defaultArrowShape.props?.font ?? 'draw',
			kind: defaultArrowShape.props?.kind ?? 'arc',
			labelColor: defaultArrowShape.props?.labelColor ?? 'black',
			labelPosition: defaultArrowShape.props?.labelPosition ?? 0.5,
			richText,
			scale: defaultArrowShape.props?.scale ?? 1,
			size: defaultArrowShape.props?.size ?? 's',
			start: { x: x1 - minX, y: y1 - minY },
		},
		meta: {
			note: simpleShape.note ?? defaultArrowShape.meta?.note ?? '',
		},
	}

	// Handle arrow bindings if fromId or toId are provided
	const bindings: TLBindingCreate[] = []

	if (simpleShape.fromId) {
		const fromId = convertSimpleIdToTldrawId(simpleShape.fromId)
		const startShape = editor.getShape(fromId)
		if (startShape) {
			const targetPoint = { x: x1, y: y1 }
			const finalNormalizedAnchor = calculateArrowBindingAnchor(editor, startShape, targetPoint)
			bindings.push({
				type: 'arrow',
				typeName: 'binding',
				fromId: shapeId,
				toId: startShape.id,
				props: {
					normalizedAnchor: finalNormalizedAnchor,
					isExact: false,
					isPrecise: true,
					terminal: 'start',
				},
				meta: {},
			})
		}
	}

	if (simpleShape.toId) {
		const toId = convertSimpleIdToTldrawId(simpleShape.toId)
		const endShape = editor.getShape(toId)
		if (endShape) {
			const targetPoint = { x: x2, y: y2 }
			const finalNormalizedAnchor = calculateArrowBindingAnchor(editor, endShape, targetPoint)
			bindings.push({
				type: 'arrow',
				typeName: 'binding',
				fromId: shapeId,
				toId: endShape.id,
				props: {
					normalizedAnchor: finalNormalizedAnchor,
					isExact: false,
					isPrecise: true,
					terminal: 'end',
				},
				meta: {},
			})
		}
	}

	return {
		shape,
		bindings: bindings.length > 0 ? bindings : undefined,
	}
}

function convertGeoShapeToTldrawShape(
	editor: Editor,
	simpleShape: SimpleGeoShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(simpleShape.shapeId)
	const shapeType = convertSimpleGeoTypeToTldrawGeoGeoType(simpleShape._type)
	const defaultGeoShape = defaultShape as TLGeoShape

	// Handle richText properly - simpleShape takes priority
	let richText
	if (simpleShape.text !== undefined) {
		richText = toRichText(simpleShape.text)
	} else if (defaultGeoShape.props?.richText) {
		richText = defaultGeoShape.props.richText
	} else {
		richText = toRichText('')
	}

	// Handle fill properly - simpleShape takes priority
	let fill
	if (simpleShape.fill !== undefined) {
		fill = convertSimpleFillToTldrawFill(simpleShape.fill)
	} else if (defaultGeoShape.props?.fill) {
		fill = defaultGeoShape.props.fill
	} else {
		fill = convertSimpleFillToTldrawFill('none')
	}

	return {
		shape: {
			id: shapeId,
			type: 'geo',
			typeName: 'shape',
			x: simpleShape.x ?? defaultGeoShape.x ?? 0,
			y: simpleShape.y ?? defaultGeoShape.y ?? 0,
			rotation: defaultGeoShape.rotation ?? 0,
			index: defaultGeoShape.index ?? ('a1' as IndexKey),
			parentId: defaultGeoShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultGeoShape.isLocked ?? false,
			opacity: defaultGeoShape.opacity ?? 1,
			props: {
				align: simpleShape.textAlign ?? defaultGeoShape.props?.align ?? 'middle',
				color: asColor(simpleShape.color ?? defaultGeoShape.props?.color ?? 'black'),
				dash: defaultGeoShape.props?.dash ?? 'draw',
				fill,
				font: defaultGeoShape.props?.font ?? 'draw',
				geo: shapeType,
				growY: defaultGeoShape.props?.growY ?? 0,
				h: simpleShape.h ?? defaultGeoShape.props?.h ?? 100,
				labelColor: defaultGeoShape.props?.labelColor ?? 'black',
				richText,
				scale: defaultGeoShape.props?.scale ?? 1,
				size: defaultGeoShape.props?.size ?? 's',
				url: defaultGeoShape.props?.url ?? '',
				verticalAlign: defaultGeoShape.props?.verticalAlign ?? 'middle',
				w: simpleShape.w ?? defaultGeoShape.props?.w ?? 100,
			},
			meta: {
				note: simpleShape.note ?? defaultGeoShape.meta?.note ?? '',
			},
		},
	}
}

function convertNoteShapeToTldrawShape(
	editor: Editor,
	simpleShape: SimpleNoteShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(simpleShape.shapeId)

	const defaultNoteShape = defaultShape as TLNoteShape

	// Handle richText properly - simpleShape takes priority
	let richText
	if (simpleShape.text !== undefined) {
		richText = toRichText(simpleShape.text)
	} else if (defaultNoteShape.props?.richText) {
		richText = defaultNoteShape.props.richText
	} else {
		richText = toRichText('')
	}

	return {
		shape: {
			id: shapeId,
			type: 'note',
			typeName: 'shape',
			x: simpleShape.x ?? defaultNoteShape.x ?? 0,
			y: simpleShape.y ?? defaultNoteShape.y ?? 0,
			rotation: defaultNoteShape.rotation ?? 0,
			index: defaultNoteShape.index ?? ('a1' as IndexKey),
			parentId: defaultNoteShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultNoteShape.isLocked ?? false,
			opacity: defaultNoteShape.opacity ?? 1,
			props: {
				color: asColor(simpleShape.color ?? defaultNoteShape.props?.color ?? 'black'),
				richText,
				size: defaultNoteShape.props?.size ?? 's',
				align: defaultNoteShape.props?.align ?? 'middle',
				font: defaultNoteShape.props?.font ?? 'draw',
				fontSizeAdjustment: defaultNoteShape.props?.fontSizeAdjustment ?? 0,
				growY: defaultNoteShape.props?.growY ?? 0,
				labelColor: defaultNoteShape.props?.labelColor ?? 'black',
				scale: defaultNoteShape.props?.scale ?? 1,
				url: defaultNoteShape.props?.url ?? '',
				verticalAlign: defaultNoteShape.props?.verticalAlign ?? 'middle',
			},
			meta: {
				note: simpleShape.note ?? defaultNoteShape.meta?.note ?? '',
			},
		},
	}
}

function convertDrawShapeToTldrawShape(
	editor: Editor,
	simpleShape: SimpleDrawShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(simpleShape.shapeId)
	const defaultDrawShape = defaultShape as TLDrawShape

	// Handle fill properly - simpleShape takes priority
	let fill
	if (simpleShape.fill !== undefined) {
		fill = convertSimpleFillToTldrawFill(simpleShape.fill)
	} else if (defaultDrawShape.props?.fill) {
		fill = defaultDrawShape.props.fill
	} else {
		fill = convertSimpleFillToTldrawFill('none')
	}

	return {
		shape: {
			id: shapeId,
			type: 'draw',
			typeName: 'shape',
			x: defaultDrawShape.x ?? 0,
			y: defaultDrawShape.y ?? 0,
			rotation: defaultDrawShape.rotation ?? 0,
			index: defaultDrawShape.index ?? ('a1' as IndexKey),
			parentId: defaultDrawShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultDrawShape.isLocked ?? false,
			opacity: defaultDrawShape.opacity ?? 1,
			props: {
				color: asColor(simpleShape.color ?? defaultDrawShape.props?.color ?? 'black'),
				fill,
			},
			meta: {
				note: simpleShape.note ?? defaultDrawShape.meta?.note ?? '',
			},
		},
	}
}

function convertUnknownShapeToTldrawShape(
	editor: Editor,
	simpleShape: SimpleUnknownShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(simpleShape.shapeId)

	return {
		shape: {
			id: shapeId,
			type: defaultShape.type ?? 'geo',
			typeName: 'shape',
			x: simpleShape.x ?? defaultShape.x ?? 0,
			y: simpleShape.y ?? defaultShape.y ?? 0,
			rotation: defaultShape.rotation ?? 0,
			index: defaultShape.index ?? ('a1' as IndexKey),
			parentId: defaultShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultShape.isLocked ?? false,
			opacity: defaultShape.opacity ?? 1,
			props: defaultShape.props ?? {},
			meta: {
				note: simpleShape.note ?? defaultShape.meta?.note ?? '',
			},
		},
	}
}

/**
 * Helper function to calculate the best normalized anchor point for arrow binding
 * @param editor - The tldraw editor instance
 * @param targetShape - The shape to bind to
 * @param targetPoint - The desired point in page space
 * @returns The normalized anchor point (0-1 range within shape bounds)
 */
function calculateArrowBindingAnchor(
	editor: Editor,
	targetShape: TLShape,
	targetPoint: VecLike
): VecLike {
	const targetShapePageBounds = editor.getShapePageBounds(targetShape)
	const targetShapeGeometry = editor.getShapeGeometry(targetShape)

	if (!targetShapePageBounds || !targetShapeGeometry) {
		return { x: 0.5, y: 0.5 } // Fall back to center
	}

	// transforms the target shape's geometry to page space for calculations
	const pageTransform = editor.getShapePageTransform(targetShape)
	const targetShapeGeometryInPageSpace = targetShapeGeometry.transform(pageTransform)

	// Step 1: Find the best anchor point on the shape
	// If the target point is inside the shape, use it; otherwise use the nearest point on the shape
	const anchorPoint = targetShapeGeometryInPageSpace.hitTestPoint(targetPoint, 0, true)
		? targetPoint
		: targetShapeGeometryInPageSpace.nearestPoint(targetPoint)

	// Step 2: Convert anchor point to normalized coordinates (0-1 range within shape bounds)
	const normalizedAnchor = {
		x: (anchorPoint.x - targetShapePageBounds.x) / targetShapePageBounds.w,
		y: (anchorPoint.y - targetShapePageBounds.y) / targetShapePageBounds.h,
	}

	// Step 3: Clamp normalized coordinates to valid range [0, 1]
	const clampedNormalizedAnchor = {
		x: Math.max(0, Math.min(1, normalizedAnchor.x)),
		y: Math.max(0, Math.min(1, normalizedAnchor.y)),
	}

	// Step 4: Validate that the clamped anchor point is still within the shape geometry. This is necessary because the above logic sometimes fails for some reason?
	const clampedAnchorInPageSpace = {
		x: targetShapePageBounds.x + clampedNormalizedAnchor.x * targetShapePageBounds.w,
		y: targetShapePageBounds.y + clampedNormalizedAnchor.y * targetShapePageBounds.h,
	}

	const finalNormalizedAnchor = targetShapeGeometryInPageSpace.hitTestPoint(
		clampedAnchorInPageSpace,
		0,
		true
	)
		? clampedNormalizedAnchor
		: { x: 0.5, y: 0.5 } // Fall back to center

	return finalNormalizedAnchor
}
