/**
 * Convert FocusedShape → tldraw TLShape.
 * Ported from tldraw/tldraw templates/agent/shared/format/convertFocusedShapeToTldrawShape.ts
 */
import {
	Box,
	createShapeId,
	Editor,
	IndexKey,
	reverseRecordsDiff,
	TLArrowShape,
	TLBindingCreate,
	TLDefaultSizeStyle,
	TLDrawShape,
	TLGeoShape,
	TLLineShape,
	TLNoteShape,
	TLShape,
	TLTextShape,
	toRichText,
	Vec,
} from 'tldraw'
import {
	asColor,
	convertFocusedFillToTldrawFill,
	convertFocusedFontSizeToTldrawFontSizeAndScale,
	convertSimpleIdToTldrawId,
	FOCUSED_TO_GEO_TYPES,
	type FocusedArrowShape,
	type FocusedDrawShape,
	type FocusedGeoShape,
	type FocusedGeoShapeType,
	type FocusedLineShape,
	type FocusedNoteShape,
	type FocusedShape,
	type FocusedTextShape,
	type FocusedUnknownShape,
} from './format'

export function convertFocusedShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape; bindings?: TLBindingCreate[] } {
	switch (focusedShape._type) {
		case 'text':
			return convertTextShapeToTldrawShape(editor, focusedShape, { defaultShape })
		case 'line':
			return convertLineShapeToTldrawShape(editor, focusedShape, { defaultShape })
		case 'arrow':
			return convertArrowShapeToTldrawShape(editor, focusedShape, { defaultShape })
		case 'note':
			return convertNoteShapeToTldrawShape(editor, focusedShape, { defaultShape })
		case 'draw':
			return convertDrawShapeToTldrawShape(editor, focusedShape, { defaultShape })
		case 'unknown':
			return convertUnknownShapeToTldrawShape(editor, focusedShape, { defaultShape })
		default:
			// Geo types (rectangle, ellipse, etc.)
			return convertGeoShapeToTldrawShape(editor, focusedShape as FocusedGeoShape, {
				defaultShape,
			})
	}
}

export function convertFocusedGeoTypeToTldrawGeoGeoType(type: FocusedGeoShapeType) {
	return FOCUSED_TO_GEO_TYPES[type]
}

function convertTextShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedTextShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLTextShape } {
	const shapeId = convertSimpleIdToTldrawId(focusedShape.shapeId)
	const defaultTextShape = defaultShape as TLTextShape
	const baseFontSize = editor.getTheme('default')?.fontSize ?? 16

	let textSize: TLDefaultSizeStyle = 's'
	let scale = 1

	if (focusedShape.fontSize) {
		const result = convertFocusedFontSizeToTldrawFontSizeAndScale(
			focusedShape.fontSize,
			baseFontSize
		)
		textSize = result.textSize
		scale = result.scale
	} else if (defaultTextShape.props?.size) {
		textSize = defaultTextShape.props.size
		scale = defaultTextShape.props.scale ?? 1
	}

	const autoSize =
		focusedShape.maxWidth !== undefined && focusedShape.maxWidth !== null
			? false
			: (defaultTextShape.props?.autoSize ?? true)
	const font = defaultTextShape.props?.font ?? 'draw'

	let richText
	if (focusedShape.text !== undefined) {
		richText = toRichText(focusedShape.text)
	} else if (defaultTextShape.props?.richText) {
		richText = defaultTextShape.props.richText
	} else {
		richText = toRichText('')
	}

	let textAlign: TLTextShape['props']['textAlign'] = defaultTextShape.props?.textAlign ?? 'start'
	switch (focusedShape.anchor) {
		case 'top-left':
		case 'bottom-left':
		case 'center-left':
			textAlign = 'start'
			break
		case 'top-center':
		case 'bottom-center':
		case 'center':
			textAlign = 'middle'
			break
		case 'top-right':
		case 'bottom-right':
		case 'center-right':
			textAlign = 'end'
			break
	}

	const unpositionedShape: TLTextShape = {
		id: shapeId,
		type: 'text',
		typeName: 'shape',
		x: 0,
		y: 0,
		rotation: defaultTextShape.rotation ?? 0,
		index: defaultTextShape.index ?? editor.getHighestIndexForParent(editor.getCurrentPageId()),
		parentId: defaultTextShape.parentId ?? editor.getCurrentPageId(),
		isLocked: defaultTextShape.isLocked ?? false,
		opacity: defaultTextShape.opacity ?? 1,
		props: {
			size: textSize,
			scale,
			richText,
			color: asColor(focusedShape.color ?? defaultTextShape.props?.color ?? 'black'),
			textAlign,
			autoSize,
			w:
				focusedShape.maxWidth !== undefined && focusedShape.maxWidth !== null
					? focusedShape.maxWidth
					: (defaultTextShape.props?.w ?? 100),
			font,
		},
		meta: {
			note: focusedShape.note ?? defaultTextShape.meta?.note ?? '',
		},
	}

	const unpositionedBounds = getDummyBounds(editor, unpositionedShape)

	const position = new Vec(defaultTextShape.x ?? 0, defaultTextShape.y ?? 0)
	const x = focusedShape.x ?? defaultTextShape.x ?? 0
	const y = focusedShape.y ?? defaultTextShape.y ?? 0
	switch (focusedShape.anchor) {
		case 'top-center': {
			position.x = x - unpositionedBounds.w / 2
			position.y = y
			break
		}
		case 'top-right': {
			position.x = x - unpositionedBounds.w
			position.y = y
			break
		}
		case 'bottom-left': {
			position.x = x
			position.y = y - unpositionedBounds.h
			break
		}
		case 'bottom-center': {
			position.x = x - unpositionedBounds.w / 2
			position.y = y - unpositionedBounds.h
			break
		}
		case 'bottom-right': {
			position.x = x - unpositionedBounds.w
			position.y = y - unpositionedBounds.h
			break
		}
		case 'center-left': {
			position.x = x
			position.y = y - unpositionedBounds.h / 2
			break
		}
		case 'center-right': {
			position.x = x - unpositionedBounds.w
			position.y = y - unpositionedBounds.h / 2
			break
		}
		case 'center': {
			position.x = focusedShape.x - unpositionedBounds.w / 2
			position.y = focusedShape.y - unpositionedBounds.h / 2
			break
		}
		case 'top-left':
		default: {
			position.x = x
			position.y = y
			break
		}
	}

	return {
		shape: { ...unpositionedShape, x: position.x, y: position.y },
	}
}

function convertLineShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedLineShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(focusedShape.shapeId)
	const defaultLineShape = defaultShape as TLLineShape

	const x1 = focusedShape.x1 ?? 0
	const y1 = focusedShape.y1 ?? 0
	const x2 = focusedShape.x2 ?? 0
	const y2 = focusedShape.y2 ?? 0
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
			index: defaultLineShape.index ?? editor.getHighestIndexForParent(editor.getCurrentPageId()),
			parentId: defaultLineShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultLineShape.isLocked ?? false,
			opacity: defaultLineShape.opacity ?? 1,
			props: {
				size: defaultLineShape.props?.size ?? 's',
				points: {
					a1: { id: 'a1', index: 'a1' as IndexKey, x: x1 - minX, y: y1 - minY },
					a2: { id: 'a2', index: 'a2' as IndexKey, x: x2 - minX, y: y2 - minY },
				},
				color: asColor(focusedShape.color ?? defaultLineShape.props?.color ?? 'black'),
				dash: defaultLineShape.props?.dash ?? 'draw',
				scale: defaultLineShape.props?.scale ?? 1,
				spline: defaultLineShape.props?.spline ?? 'line',
			},
			meta: {
				note: focusedShape.note ?? defaultLineShape.meta?.note ?? '',
			},
		},
	}
}

function convertArrowShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedArrowShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape; bindings?: TLBindingCreate[] } {
	const shapeId = convertSimpleIdToTldrawId(focusedShape.shapeId)
	const defaultArrowShape = defaultShape as TLArrowShape

	const x1 = focusedShape.x1 ?? defaultArrowShape.props?.start?.x ?? 0
	const y1 = focusedShape.y1 ?? defaultArrowShape.props?.start?.y ?? 0
	const x2 = focusedShape.x2 ?? defaultArrowShape.props?.end?.x ?? 0
	const y2 = focusedShape.y2 ?? defaultArrowShape.props?.end?.y ?? 0
	const minX = Math.min(x1, x2)
	const minY = Math.min(y1, y2)

	let richText
	if (focusedShape.text !== undefined) {
		richText = toRichText(focusedShape.text)
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
		index: defaultArrowShape.index ?? editor.getHighestIndexForParent(editor.getCurrentPageId()),
		parentId: defaultArrowShape.parentId ?? editor.getCurrentPageId(),
		isLocked: defaultArrowShape.isLocked ?? false,
		opacity: defaultArrowShape.opacity ?? 1,
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
			kind: focusedShape.kind ?? defaultArrowShape.props?.kind ?? 'arc',
			labelColor: defaultArrowShape.props?.labelColor ?? 'black',
			labelPosition: defaultArrowShape.props?.labelPosition ?? 0.5,
			richText,
			scale: defaultArrowShape.props?.scale ?? 1,
			size: defaultArrowShape.props?.size ?? 's',
			start: { x: x1 - minX, y: y1 - minY },
		},
		meta: {
			note: focusedShape.note ?? defaultArrowShape.meta?.note ?? '',
		},
	}

	const bindings: TLBindingCreate[] = []

	if (focusedShape.fromId) {
		const fromId = convertSimpleIdToTldrawId(focusedShape.fromId)
		const startShape = editor.getShape(fromId)
		if (startShape) {
			bindings.push({
				type: 'arrow',
				typeName: 'binding',
				fromId: shapeId,
				toId: startShape.id,
				props: {
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
					terminal: 'start',
				},
				meta: {},
			})
		}
	}

	if (focusedShape.toId) {
		const toId = convertSimpleIdToTldrawId(focusedShape.toId)
		const endShape = editor.getShape(toId)
		if (endShape) {
			bindings.push({
				type: 'arrow',
				typeName: 'binding',
				fromId: shapeId,
				toId: endShape.id,
				props: {
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
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
	focusedShape: FocusedGeoShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(focusedShape.shapeId)
	const shapeType = convertFocusedGeoTypeToTldrawGeoGeoType(focusedShape._type)
	const defaultGeoShape = defaultShape as TLGeoShape

	let richText
	if (focusedShape.text !== undefined) {
		richText = toRichText(focusedShape.text)
	} else if (defaultGeoShape.props?.richText) {
		richText = defaultGeoShape.props.richText
	} else {
		richText = toRichText('')
	}

	let fill
	if (focusedShape.fill !== undefined) {
		fill = convertFocusedFillToTldrawFill(focusedShape.fill) ?? 'none'
	} else if (defaultGeoShape.props?.fill) {
		fill = defaultGeoShape.props.fill
	} else {
		fill = convertFocusedFillToTldrawFill('none')
	}

	return {
		shape: {
			id: shapeId,
			type: 'geo',
			typeName: 'shape',
			x: focusedShape.x ?? defaultGeoShape.x ?? 0,
			y: focusedShape.y ?? defaultGeoShape.y ?? 0,
			rotation: defaultGeoShape.rotation ?? 0,
			index: defaultGeoShape.index ?? editor.getHighestIndexForParent(editor.getCurrentPageId()),
			parentId: defaultGeoShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultGeoShape.isLocked ?? false,
			opacity: defaultGeoShape.opacity ?? 1,
			props: {
				align: focusedShape.textAlign ?? defaultGeoShape.props?.align ?? 'start',
				color: asColor(focusedShape.color ?? defaultGeoShape.props?.color ?? 'black'),
				dash: defaultGeoShape.props?.dash ?? 'draw',
				fill,
				font: defaultGeoShape.props?.font ?? 'draw',
				geo: shapeType,
				growY: defaultGeoShape.props?.growY ?? 0,
				h: focusedShape.h ?? defaultGeoShape.props?.h ?? 100,
				labelColor: defaultGeoShape.props?.labelColor ?? 'black',
				richText,
				scale: defaultGeoShape.props?.scale ?? 1,
				size: defaultGeoShape.props?.size ?? 's',
				url: defaultGeoShape.props?.url ?? '',
				verticalAlign: defaultGeoShape.props?.verticalAlign ?? 'start',
				w: focusedShape.w ?? defaultGeoShape.props?.w ?? 100,
			},
			meta: {
				note: focusedShape.note ?? defaultGeoShape.meta?.note ?? '',
			},
		},
	}
}

function convertNoteShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedNoteShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(focusedShape.shapeId)
	const defaultNoteShape = defaultShape as TLNoteShape

	let richText
	if (focusedShape.text !== undefined) {
		richText = toRichText(focusedShape.text)
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
			x: focusedShape.x ?? defaultNoteShape.x ?? 0,
			y: focusedShape.y ?? defaultNoteShape.y ?? 0,
			rotation: defaultNoteShape.rotation ?? 0,
			index: defaultNoteShape.index ?? editor.getHighestIndexForParent(editor.getCurrentPageId()),
			parentId: defaultNoteShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultNoteShape.isLocked ?? false,
			opacity: defaultNoteShape.opacity ?? 1,
			props: {
				color: asColor(focusedShape.color ?? defaultNoteShape.props?.color ?? 'black'),
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
				textFirstEditedBy: defaultNoteShape.props?.textFirstEditedBy ?? null,
			},
			meta: {
				note: focusedShape.note ?? defaultNoteShape.meta?.note ?? '',
			},
		},
	}
}

function convertDrawShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedDrawShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(focusedShape.shapeId)
	const defaultDrawShape = defaultShape as TLDrawShape

	let fill
	if (focusedShape.fill !== undefined) {
		fill = convertFocusedFillToTldrawFill(focusedShape.fill)
	} else if (defaultDrawShape.props?.fill) {
		fill = defaultDrawShape.props.fill
	} else {
		fill = convertFocusedFillToTldrawFill('none')
	}

	return {
		shape: {
			id: shapeId,
			type: 'draw',
			typeName: 'shape',
			x: defaultDrawShape.x ?? 0,
			y: defaultDrawShape.y ?? 0,
			rotation: defaultDrawShape.rotation ?? 0,
			index: defaultDrawShape.index ?? editor.getHighestIndexForParent(editor.getCurrentPageId()),
			parentId: defaultDrawShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultDrawShape.isLocked ?? false,
			opacity: defaultDrawShape.opacity ?? 1,
			props: {
				...editor.getShapeUtil('draw').getDefaultProps(),
				color: asColor(focusedShape.color ?? defaultDrawShape.props?.color ?? 'black'),
				fill,
			},
			meta: {
				note: focusedShape.note ?? defaultDrawShape.meta?.note ?? '',
			},
		},
	}
}

function convertUnknownShapeToTldrawShape(
	editor: Editor,
	focusedShape: FocusedUnknownShape,
	{ defaultShape }: { defaultShape: Partial<TLShape> }
): { shape: TLShape } {
	const shapeId = convertSimpleIdToTldrawId(focusedShape.shapeId)

	return {
		shape: {
			id: shapeId,
			type: defaultShape.type ?? 'geo',
			typeName: 'shape',
			x: focusedShape.x ?? defaultShape.x ?? 0,
			y: focusedShape.y ?? defaultShape.y ?? 0,
			rotation: defaultShape.rotation ?? 0,
			index: defaultShape.index ?? editor.getHighestIndexForParent(editor.getCurrentPageId()),
			parentId: defaultShape.parentId ?? editor.getCurrentPageId(),
			isLocked: defaultShape.isLocked ?? false,
			opacity: defaultShape.opacity ?? 1,
			props: defaultShape.props ?? ({} as any),
			meta: {
				note: focusedShape.note ?? defaultShape.meta?.note ?? '',
			},
		},
	}
}

export function getDummyBounds(editor: Editor, shape: TLShape): Box {
	const bounds = editor.getShapePageBounds(shape)
	if (bounds) return bounds

	let dummyBounds: Box | undefined
	const diff = editor.store.extractingChanges(() => {
		editor.run(
			() => {
				const dummyId = createShapeId()
				editor.createShape({ ...shape, id: dummyId })
				dummyBounds = editor.getShapePageBounds(dummyId)
			},
			{ ignoreShapeLock: false, history: 'ignore' }
		)
	})
	const reverseDiff = reverseRecordsDiff(diff)
	editor.store.applyDiff(reverseDiff)

	if (!dummyBounds) {
		throw new Error('Failed to get bounds for shape')
	}
	return dummyBounds
}
