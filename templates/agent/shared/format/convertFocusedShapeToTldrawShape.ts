import {
	Box,
	createShapeId,
	Editor,
	IndexKey,
	reverseRecordsDiff,
	TLArrowShape,
	TLBindingCreate,
	TLDefaultFillStyle,
	TLDefaultSizeStyle,
	TLDrawShape,
	TLGeoShape,
	TLGeoShapeGeoStyle,
	TLLineShape,
	TLNoteShape,
	TLRichText,
	TLShape,
	TLShapeId,
	TLTextShape,
	toRichText,
	VecLike,
} from 'tldraw'
import { asColor } from './FocusedColor'
import { convertFocusedFillToTldrawFill, FocusedFill } from './FocusedFill'
import { convertFocusedFontSizeToTldrawFontSizeAndScale } from './FocusedFontSize'
import { FocusedGeoShapeType } from './FocusedGeoShapeType'
import {
	FocusedArrowShape,
	FocusedDrawShape,
	FocusedGeoShape,
	FocusedGeoShapePartial,
	FocusedLineShape,
	FocusedNoteShape,
	FocusedShape,
	FocusedShapePartial,
	FocusedTextAnchor,
	FocusedTextShape,
	FocusedTextShapePartial,
	FocusedUnknownShape,
} from './FocusedShape'

/**
 * Convert a FocusedShape to a tldraw shape, using defaultShape for fallback values.
 */
export function convertFocusedShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape; bindings?: TLBindingCreate[] } {
	switch (focusedShape._type) {
		case 'text': {
			return convertTextShapeToTldrawShape(editor, focusedShape, { defaultShape })
		}
		case 'line': {
			return convertLineShapeToTldrawShape(editor, focusedShape, { defaultShape })
		}
		case 'arrow': {
			return convertArrowShapeToTldrawShape(editor, focusedShape, { defaultShape })
		}
		case 'note': {
			return convertNoteShapeToTldrawShape(editor, focusedShape, { defaultShape })
		}
		case 'draw': {
			return convertDrawShapeToTldrawShape(editor, focusedShape, { defaultShape })
		}
		case 'unknown': {
			return convertUnknownShapeToTldrawShape(editor, focusedShape, { defaultShape })
		}
		default: {
			return convertGeoShapeToTldrawShape(editor, focusedShape, { defaultShape })
		}
	}
}

export function convertSimpleIdToTldrawId(id: string): TLShapeId {
	return ('shape:' + id) as TLShapeId
}

export const FOCUSED_TO_GEO_TYPES: Record<FocusedGeoShapeType, TLGeoShapeGeoStyle> = {
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

/** Record fields shared by every converted shape: id, meta, and the non-prop defaults. */
function getBaseShape(
	editor: Editor,
	focusedShape: { shapeId: string; note?: string },
	defaultShape: Partial<TLShape>
) {
	return {
		id: convertSimpleIdToTldrawId(focusedShape.shapeId),
		typeName: 'shape' as const,
		rotation: defaultShape.rotation ?? 0,
		index: defaultShape.index ?? editor.getHighestIndexForParent(editor.getCurrentPageId()),
		parentId: defaultShape.parentId ?? editor.getCurrentPageId(),
		isLocked: defaultShape.isLocked ?? false,
		opacity: defaultShape.opacity ?? 1,
		meta: {
			note: focusedShape.note ?? defaultShape.meta?.note ?? '',
		},
	}
}

function resolveRichText(text: string | undefined, defaultRichText: TLRichText | undefined) {
	if (text !== undefined) return toRichText(text)
	return defaultRichText ?? toRichText('')
}

function resolveFill(
	fill: FocusedFill | undefined,
	defaultFill: TLDefaultFillStyle | undefined
): TLDefaultFillStyle {
	if (fill !== undefined) return convertFocusedFillToTldrawFill(fill) ?? 'none'
	return defaultFill ?? 'none'
}

const TEXT_ANCHOR_ALIGN: Record<FocusedTextAnchor, TLTextShape['props']['textAlign']> = {
	'top-left': 'start',
	'bottom-left': 'start',
	'center-left': 'start',
	'top-center': 'middle',
	'bottom-center': 'middle',
	center: 'middle',
	'top-right': 'end',
	'bottom-right': 'end',
	'center-right': 'end',
}

// Fraction of the text bounds to subtract from (x, y) to get the shape's top-left corner
const TEXT_ANCHOR_OFFSET: Record<FocusedTextAnchor, VecLike> = {
	'top-left': { x: 0, y: 0 },
	'top-center': { x: 0.5, y: 0 },
	'top-right': { x: 1, y: 0 },
	'bottom-left': { x: 0, y: 1 },
	'bottom-center': { x: 0.5, y: 1 },
	'bottom-right': { x: 1, y: 1 },
	'center-left': { x: 0, y: 0.5 },
	'center-right': { x: 1, y: 0.5 },
	center: { x: 0.5, y: 0.5 },
}

function convertTextShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedTextShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLTextShape } {
	const defaultTextShape = defaultShape as TLTextShape

	let textSize: TLDefaultSizeStyle = 's'
	let scale = 1
	const font = defaultTextShape.props?.font ?? 'draw'

	if (focusedShape.fontSize) {
		const converted = convertFocusedFontSizeToTldrawFontSizeAndScale(
			editor,
			focusedShape.fontSize,
			{
				...defaultTextShape.props,
				font,
			}
		)
		textSize = converted.textSize
		scale = converted.scale
	} else if (defaultTextShape.props?.size) {
		textSize = defaultTextShape.props.size
		scale = defaultTextShape.props.scale ?? 1
	}

	// A numeric maxWidth enables wrapping; undefined or null preserves the default autoSize
	const autoSize =
		focusedShape.maxWidth != null ? false : (defaultTextShape.props?.autoSize ?? true)

	const unpositionedShape: TLTextShape = {
		...getBaseShape(editor, focusedShape, defaultShape),
		type: 'text',
		x: 0,
		y: 0,
		props: {
			size: textSize,
			scale,
			richText: resolveRichText(focusedShape.text, defaultTextShape.props?.richText),
			color: asColor(focusedShape.color ?? defaultTextShape.props?.color ?? 'black'),
			textAlign:
				TEXT_ANCHOR_ALIGN[focusedShape.anchor] ?? defaultTextShape.props?.textAlign ?? 'start',
			autoSize,
			w: focusedShape.maxWidth ?? defaultTextShape.props?.w ?? 100,
			font,
		},
	}

	const bounds = getDummyBounds(editor, unpositionedShape)
	const x = focusedShape.x ?? defaultTextShape.x ?? 0
	const y = focusedShape.y ?? defaultTextShape.y ?? 0
	const offset = TEXT_ANCHOR_OFFSET[focusedShape.anchor]
	const position = offset
		? { x: x - bounds.w * offset.x, y: y - bounds.h * offset.y }
		: { x: defaultTextShape.x ?? 0, y: defaultTextShape.y ?? 0 }

	return {
		shape: { ...unpositionedShape, ...position },
	}
}

function convertLineShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedLineShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const defaultLineShape = defaultShape as TLLineShape

	const x1 = focusedShape.x1 ?? 0
	const y1 = focusedShape.y1 ?? 0
	const x2 = focusedShape.x2 ?? 0
	const y2 = focusedShape.y2 ?? 0
	const minX = Math.min(x1, x2)
	const minY = Math.min(y1, y2)

	return {
		shape: {
			...getBaseShape(editor, focusedShape, defaultShape),
			type: 'line',
			x: minX,
			y: minY,
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
				color: asColor(focusedShape.color ?? defaultLineShape.props?.color ?? 'black'),
				dash: defaultLineShape.props?.dash ?? 'draw',
				scale: defaultLineShape.props?.scale ?? 1,
				spline: defaultLineShape.props?.spline ?? 'line',
			},
		},
	}
}

function convertArrowShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedArrowShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape; bindings?: TLBindingCreate[] } {
	const defaultArrowShape = defaultShape as TLArrowShape

	const x1 = focusedShape.x1 ?? defaultArrowShape.props?.start?.x ?? 0
	const y1 = focusedShape.y1 ?? defaultArrowShape.props?.start?.y ?? 0
	const x2 = focusedShape.x2 ?? defaultArrowShape.props?.end?.x ?? 0
	const y2 = focusedShape.y2 ?? defaultArrowShape.props?.end?.y ?? 0
	const minX = Math.min(x1, x2)
	const minY = Math.min(y1, y2)

	const shape: TLArrowShape = {
		...getBaseShape(editor, focusedShape, defaultShape),
		type: 'arrow',
		x: minX,
		y: minY,
		props: {
			arrowheadEnd: defaultArrowShape.props?.arrowheadEnd ?? 'arrow',
			arrowheadStart: defaultArrowShape.props?.arrowheadStart ?? 'none',
			bend: (focusedShape.bend ?? (defaultArrowShape.props?.bend ?? 0) * -1) * -1,
			color: asColor(focusedShape.color ?? defaultArrowShape.props?.color ?? 'black'),
			dash: defaultArrowShape.props?.dash ?? 'draw',
			elbowMidPoint: defaultArrowShape.props?.elbowMidPoint ?? 0.5,
			end: { x: x2 - minX, y: y2 - minY },
			fill: defaultArrowShape.props?.fill ?? 'none',
			font: defaultArrowShape.props?.font ?? 'draw',
			kind: defaultArrowShape.props?.kind ?? 'arc',
			labelColor: defaultArrowShape.props?.labelColor ?? 'black',
			labelPosition: defaultArrowShape.props?.labelPosition ?? 0.5,
			richText: resolveRichText(focusedShape.text, defaultArrowShape.props?.richText),
			scale: defaultArrowShape.props?.scale ?? 1,
			size: defaultArrowShape.props?.size ?? 's',
			start: { x: x1 - minX, y: y1 - minY },
		},
	}

	const bindings = [
		createArrowBinding(editor, shape.id, focusedShape.fromId, 'start', { x: x1, y: y1 }),
		createArrowBinding(editor, shape.id, focusedShape.toId, 'end', { x: x2, y: y2 }),
	].filter((binding): binding is TLBindingCreate => binding !== null)

	return {
		shape,
		bindings: bindings.length > 0 ? bindings : undefined,
	}
}

function createArrowBinding(
	editor: Editor,
	arrowId: TLShapeId,
	targetSimpleId: string | null,
	terminal: 'start' | 'end',
	targetPoint: VecLike
): TLBindingCreate | null {
	if (!targetSimpleId) return null
	const targetShape = editor.getShape(convertSimpleIdToTldrawId(targetSimpleId))
	if (!targetShape) return null
	return {
		type: 'arrow',
		typeName: 'binding',
		fromId: arrowId,
		toId: targetShape.id,
		props: {
			normalizedAnchor: calculateArrowBindingAnchor(editor, targetShape, targetPoint),
			isExact: false,
			isPrecise: true,
			terminal,
		},
		meta: {},
	}
}

function convertGeoShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedGeoShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const defaultGeoShape = defaultShape as TLGeoShape

	return {
		shape: {
			...getBaseShape(editor, focusedShape, defaultShape),
			type: 'geo',
			x: focusedShape.x ?? defaultGeoShape.x ?? 0,
			y: focusedShape.y ?? defaultGeoShape.y ?? 0,
			props: {
				align: focusedShape.textAlign ?? defaultGeoShape.props?.align ?? 'middle',
				color: asColor(focusedShape.color ?? defaultGeoShape.props?.color ?? 'black'),
				dash: defaultGeoShape.props?.dash ?? 'draw',
				fill: resolveFill(focusedShape.fill, defaultGeoShape.props?.fill),
				font: defaultGeoShape.props?.font ?? 'draw',
				geo: FOCUSED_TO_GEO_TYPES[focusedShape._type],
				growY: defaultGeoShape.props?.growY ?? 0,
				h: focusedShape.h ?? defaultGeoShape.props?.h ?? 100,
				labelColor: defaultGeoShape.props?.labelColor ?? 'black',
				richText: resolveRichText(focusedShape.text, defaultGeoShape.props?.richText),
				scale: defaultGeoShape.props?.scale ?? 1,
				size: defaultGeoShape.props?.size ?? 's',
				url: defaultGeoShape.props?.url ?? '',
				verticalAlign: defaultGeoShape.props?.verticalAlign ?? 'middle',
				w: focusedShape.w ?? defaultGeoShape.props?.w ?? 100,
				flipX: defaultGeoShape.props?.flipX ?? false,
				flipY: defaultGeoShape.props?.flipY ?? false,
			},
		},
	}
}

function convertNoteShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedNoteShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const defaultNoteShape = defaultShape as TLNoteShape

	return {
		shape: {
			...getBaseShape(editor, focusedShape, defaultShape),
			type: 'note',
			x: focusedShape.x ?? defaultNoteShape.x ?? 0,
			y: focusedShape.y ?? defaultNoteShape.y ?? 0,
			props: {
				color: asColor(focusedShape.color ?? defaultNoteShape.props?.color ?? 'black'),
				richText: resolveRichText(focusedShape.text, defaultNoteShape.props?.richText),
				size: defaultNoteShape.props?.size ?? 's',
				align: defaultNoteShape.props?.align ?? 'middle',
				font: defaultNoteShape.props?.font ?? 'draw',
				fontSizeAdjustment: defaultNoteShape.props?.fontSizeAdjustment ?? 1,
				growY: defaultNoteShape.props?.growY ?? 0,
				labelColor: defaultNoteShape.props?.labelColor ?? 'black',
				scale: defaultNoteShape.props?.scale ?? 1,
				url: defaultNoteShape.props?.url ?? '',
				verticalAlign: defaultNoteShape.props?.verticalAlign ?? 'middle',
				textLastEditedBy: defaultNoteShape.props?.textLastEditedBy ?? null,
			},
		},
	}
}

function convertDrawShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedDrawShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const defaultDrawShape = defaultShape as TLDrawShape

	return {
		shape: {
			...getBaseShape(editor, focusedShape, defaultShape),
			type: 'draw',
			x: defaultDrawShape.x ?? 0,
			y: defaultDrawShape.y ?? 0,
			props: {
				...editor.getShapeUtil('draw').getDefaultProps(),
				color: asColor(focusedShape.color ?? defaultDrawShape.props?.color ?? 'black'),
				fill: resolveFill(focusedShape.fill, defaultDrawShape.props?.fill),
			},
		},
	}
}

function convertUnknownShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedUnknownShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	return {
		shape: {
			...getBaseShape(editor, focusedShape, defaultShape),
			type: defaultShape.type ?? 'geo',
			x: focusedShape.x ?? defaultShape.x ?? 0,
			y: focusedShape.y ?? defaultShape.y ?? 0,
			props: defaultShape.props ?? ({} as any),
		},
	}
}

/**
 * Find the normalized anchor (0-1 within the shape's bounds) closest to targetPoint that still
 * lands on the shape's geometry.
 */
function calculateArrowBindingAnchor(
	editor: Editor,
	targetShape: TLShape,
	targetPoint: VecLike
): VecLike {
	const center = { x: 0.5, y: 0.5 }
	const targetShapePageBounds = editor.getShapePageBounds(targetShape)
	const targetShapeGeometry = editor.getShapeGeometry(targetShape)

	if (!targetShapePageBounds || !targetShapeGeometry) {
		return center
	}

	const pageTransform = editor.getShapePageTransform(targetShape)
	const targetShapeGeometryInPageSpace = targetShapeGeometry.transform(pageTransform)

	// If the target point is inside the shape, use it; otherwise use the nearest point on the shape
	const anchorPoint = targetShapeGeometryInPageSpace.hitTestPoint(targetPoint, 0, true)
		? targetPoint
		: targetShapeGeometryInPageSpace.nearestPoint(targetPoint)

	const clampedNormalizedAnchor = {
		x: Math.max(
			0.1,
			Math.min(0.9, (anchorPoint.x - targetShapePageBounds.x) / targetShapePageBounds.w)
		),
		y: Math.max(
			0.1,
			Math.min(0.9, (anchorPoint.y - targetShapePageBounds.y) / targetShapePageBounds.h)
		),
	}

	// Clamping can push the anchor off the geometry (e.g. concave shapes); fall back to the center if so
	const clampedAnchorInPageSpace = {
		x: targetShapePageBounds.x + clampedNormalizedAnchor.x * targetShapePageBounds.w,
		y: targetShapePageBounds.y + clampedNormalizedAnchor.y * targetShapePageBounds.h,
	}

	return targetShapeGeometryInPageSpace.hitTestPoint(clampedAnchorInPageSpace, 0, true)
		? clampedNormalizedAnchor
		: center
}

function getDummyBounds(editor: Editor, shape: TLShape): Box {
	return editor.getShapePageBounds(shape) ?? measureUncreatedShapeBounds(editor, shape)
}

/**
 * Get the page bounds of a shape that isn't in the store yet by creating a throwaway copy of it,
 * measuring it, then reverting the creation.
 */
export function measureUncreatedShapeBounds(editor: Editor, shape: TLShape): Box {
	let bounds: Box | undefined
	const diff = editor.store.extractingChanges(() => {
		editor.run(
			() => {
				const dummyId = createShapeId()
				editor.createShape({ ...shape, id: dummyId })
				bounds = editor.getShapePageBounds(dummyId)
			},
			{ ignoreShapeLock: false, history: 'ignore' }
		)
	})
	editor.store.applyDiff(reverseRecordsDiff(diff))

	if (!bounds) {
		throw new Error('Failed to get bounds for shape')
	}
	return bounds
}

/**
 * Convert a partial FocusedShape (still streaming) to a tldraw shape. Text and geo shapes render as
 * soon as their position/size fields arrive; everything else waits until the shape is complete.
 * Returns null fields when the shape can't be rendered yet.
 */
export function convertPartialFocusedShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedShapePartial,
	{ defaultShape, complete }: { defaultShape: Partial<TLShape>; complete: boolean }
): { shape: TLShape | null; bindings: TLBindingCreate[] | null; position: VecLike | null } {
	const notReady = { shape: null, bindings: null, position: null }

	if (focusedShape._type === 'text') {
		const partial = focusedShape as FocusedTextShapePartial
		if (partial.x === undefined || partial.y === undefined || partial.text === undefined) {
			return notReady
		}
		const fullShape: FocusedTextShape = {
			...partial,
			_type: 'text',
			shapeId: partial.shapeId ?? ('streaming-shape' as any),
			note: partial.note ?? '',
			anchor: partial.anchor ?? 'top-left',
			color: partial.color ?? 'black',
			maxWidth: partial.maxWidth ?? null,
		} as FocusedTextShape
		const result = convertTextShapeToTldrawShape(editor, fullShape, { defaultShape })
		return { shape: result.shape, bindings: null, position: { x: partial.x, y: partial.y } }
	}

	if (focusedShape._type && focusedShape._type in FOCUSED_TO_GEO_TYPES) {
		const partial = focusedShape as FocusedGeoShapePartial
		if (
			partial.x === undefined ||
			partial.y === undefined ||
			partial.w === undefined ||
			partial.h === undefined
		) {
			return notReady
		}
		const fullShape: FocusedGeoShape = {
			...partial,
			_type: focusedShape._type as FocusedGeoShape['_type'],
			shapeId: partial.shapeId ?? ('streaming-shape' as any),
			note: partial.note ?? '',
			color: partial.color ?? 'black',
			textAlign: partial.textAlign || 'middle',
		} as FocusedGeoShape
		const result = convertGeoShapeToTldrawShape(editor, fullShape, { defaultShape })
		return { shape: result.shape, bindings: null, position: { x: partial.x, y: partial.y } }
	}

	if (!complete) {
		return notReady
	}

	const result = convertFocusedShapeToTldrawShape(editor, focusedShape as FocusedShape, {
		defaultShape,
	})
	const position =
		'x' in focusedShape && 'y' in focusedShape
			? { x: focusedShape.x as number, y: focusedShape.y as number }
			: 'x1' in focusedShape && 'y1' in focusedShape
				? { x: focusedShape.x1 as number, y: focusedShape.y1 as number }
				: null
	return { shape: result.shape, bindings: result.bindings ?? null, position }
}
