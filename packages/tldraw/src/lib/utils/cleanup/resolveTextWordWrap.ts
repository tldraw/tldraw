import {
	Editor,
	Mat,
	TLArrowShape,
	TLGeoShape,
	TLShape,
	TLShapeId,
	TLTextShape,
	isPageId,
} from '@tldraw/editor'
import { getArrowBindings } from '../../shapes/arrow/shared'
import {
	ARROW_LABEL_FONT_SIZES,
	FONT_FAMILIES,
	FONT_SIZES,
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	TEXT_PROPS,
} from '../../shapes/shared/default-shape-constants'
import { isEmptyRichText, renderHtmlFromRichTextForMeasurement } from '../text/richText'

const ARROW_LABEL_BODY_MARGIN = 64

/** @public */
export interface ResolveTextWordWrapOptions {
	/** The shape IDs to process. Defaults to direct children of the current page. */
	shapeIds?: TLShapeId[]
}

/**
 * Expands shapes so that no single word is split across lines by overflow-wrap. Handles geo
 * shapes, fixed-width text shapes, and bound arrow labels.
 *
 * @public
 */
export function resolveTextWordWrap(editor: Editor, opts: ResolveTextWordWrapOptions = {}) {
	const shapes = opts.shapeIds
		? opts.shapeIds.map((id) => editor.getShape(id)).filter((s): s is TLShape => !!s)
		: editor.getCurrentPageShapes().filter((s) => isPageId(s.parentId))

	const scopeIds = opts.shapeIds ? new Set(opts.shapeIds) : null

	const shapeUpdates: TLShape[] = []
	for (const shape of shapes) {
		if (shape.type === 'geo') {
			const result = getGeoShapeWordWrapFix(editor, shape as TLGeoShape)
			if (result) shapeUpdates.push(result)
		} else if (shape.type === 'text') {
			const result = getTextShapeWordWrapFix(editor, shape as TLTextShape)
			if (result) shapeUpdates.push(result)
		}
	}

	const labeledArrows = shapes.filter(
		(s): s is TLArrowShape =>
			s.type === 'arrow' && !isEmptyRichText((s as TLArrowShape).props.richText)
	)

	if (shapeUpdates.length === 0 && labeledArrows.length === 0) return

	editor.run(() => {
		if (shapeUpdates.length > 0) {
			editor.updateShapes(shapeUpdates)
		}

		const positionDeltas = new Map<TLShapeId, { x: number; y: number }>()
		for (const arrow of labeledArrows) {
			collectArrowLabelFix(editor, arrow, positionDeltas, scopeIds)
		}

		if (positionDeltas.size > 0) {
			const positionUpdates: TLShape[] = []
			for (const [id, delta] of positionDeltas) {
				if (Math.abs(delta.x) < 0.01 && Math.abs(delta.y) < 0.01) continue
				const shape = editor.getShape(id)
				if (!shape) continue
				const pageTransform = editor.getShapePageTransform(shape)
				if (!pageTransform) continue
				const pageOrigin = pageTransform.point()
				const newPageOrigin = { x: pageOrigin.x + delta.x, y: pageOrigin.y + delta.y }
				const parentTransform = editor.getShapeParentTransform(shape)
				const newLocalOrigin = Mat.applyToPoint(Mat.Inverse(parentTransform), newPageOrigin)
				positionUpdates.push({ ...shape, x: newLocalOrigin.x, y: newLocalOrigin.y })
			}
			if (positionUpdates.length > 0) {
				editor.updateShapes(positionUpdates)
			}
		}
	})
}

function getGeoShapeWordWrapFix(editor: Editor, shape: TLGeoShape): TLGeoShape | null {
	if (isEmptyRichText(shape.props.richText)) return null

	const { w, font, size, scale } = shape.props
	const textAreaWidth = Math.max(1, Math.floor(w / scale - LABEL_PADDING * 2))
	const html = renderHtmlFromRichTextForMeasurement(editor, shape.props.richText)

	const measured = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: LABEL_FONT_SIZES[size],
		maxWidth: textAreaWidth,
		disableOverflowWrapBreaking: true,
		measureScrollWidth: true,
	})

	if (measured.scrollWidth <= textAreaWidth + 1) return null

	const newW = (measured.scrollWidth + 1 + LABEL_PADDING * 2) * scale
	const deltaW = newW - w
	return {
		...shape,
		x: shape.x - deltaW / 2,
		props: { ...shape.props, w: newW },
	}
}

function getTextShapeWordWrapFix(editor: Editor, shape: TLTextShape): TLTextShape | null {
	if (shape.props.autoSize) return null

	const { font, size, w } = shape.props
	const currentWidth = Math.max(16, Math.floor(w))
	const html = renderHtmlFromRichTextForMeasurement(editor, shape.props.richText)

	const measured = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: FONT_SIZES[size],
		maxWidth: currentWidth,
		disableOverflowWrapBreaking: true,
		measureScrollWidth: true,
	})

	if (measured.scrollWidth <= currentWidth + 1) return null

	const newW = measured.scrollWidth + 1
	const deltaW = newW - w
	return {
		...shape,
		x: shape.x - deltaW / 2,
		props: { ...shape.props, w: newW },
	}
}

function collectArrowLabelFix(
	editor: Editor,
	arrow: TLArrowShape,
	positionDeltas: Map<TLShapeId, { x: number; y: number }>,
	scopeIds: Set<TLShapeId> | null
) {
	const bindings = getArrowBindings(editor, arrow)
	if (!bindings.start || !bindings.end) return
	if (bindings.start.toId === bindings.end.toId) return

	if (scopeIds && (!scopeIds.has(bindings.start.toId) || !scopeIds.has(bindings.end.toId))) return

	const shapeA = editor.getShape(bindings.start.toId)
	const shapeB = editor.getShape(bindings.end.toId)
	if (!shapeA || !shapeB) return

	const boundsA = editor.getShapePageBounds(shapeA)
	const boundsB = editor.getShapePageBounds(shapeB)
	if (!boundsA || !boundsB) return

	const fontSize = ARROW_LABEL_FONT_SIZES[arrow.props.size] * arrow.props.scale
	const html = renderHtmlFromRichTextForMeasurement(editor, arrow.props.richText)
	const { scrollWidth: widestWordWidth } = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[arrow.props.font],
		fontSize,
		maxWidth: 1,
		disableOverflowWrapBreaking: true,
		measureScrollWidth: true,
	})

	const requiredBodyLength = widestWordWidth + ARROW_LABEL_BODY_MARGIN

	const cAx = boundsA.x + boundsA.w / 2
	const cAy = boundsA.y + boundsA.h / 2
	const cBx = boundsB.x + boundsB.w / 2
	const cBy = boundsB.y + boundsB.h / 2
	const ddx = cBx - cAx
	const ddy = cBy - cAy
	const dist = Math.sqrt(ddx * ddx + ddy * ddy)
	if (dist < 1) return

	const dirX = ddx / dist
	const dirY = ddy / dist

	const aMaxProj = Math.max(...boundsA.corners.map((c) => c.x * dirX + c.y * dirY))
	const bMinProj = Math.min(...boundsB.corners.map((c) => c.x * dirX + c.y * dirY))
	const currentBodyLength = Math.max(0, bMinProj - aMaxProj)

	if (currentBodyLength >= requiredBodyLength) return

	const halfExtra = (requiredBodyLength - currentBodyLength) / 2
	const da = positionDeltas.get(shapeA.id) ?? { x: 0, y: 0 }
	const db = positionDeltas.get(shapeB.id) ?? { x: 0, y: 0 }
	da.x -= dirX * halfExtra
	da.y -= dirY * halfExtra
	db.x += dirX * halfExtra
	db.y += dirY * halfExtra
	positionDeltas.set(shapeA.id, da)
	positionDeltas.set(shapeB.id, db)
}
