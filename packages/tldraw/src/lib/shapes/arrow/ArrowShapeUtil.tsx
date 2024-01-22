import {
	Arc2d,
	Box,
	DefaultFontFamilies,
	Edge2d,
	Geometry2d,
	Group2d,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	SvgExportContext,
	TLArrowShape,
	TLArrowShapeArrowheadStyle,
	TLArrowShapeProps,
	TLDefaultColorStyle,
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	TLHandle,
	TLOnEditEndHandler,
	TLOnHandleChangeHandler,
	TLOnResizeHandler,
	TLOnTranslateHandler,
	TLOnTranslateStartHandler,
	TLShapePartial,
	TLShapeUtilCanvasSvgDef,
	TLShapeUtilFlag,
	Vec,
	VecLike,
	arrowShapeMigrations,
	arrowShapeProps,
	clamp,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
	deepCopy,
	getArrowTerminalsInArrowSpace,
	getDefaultColorTheme,
	getPointOnCircle,
	intersectLineSegmentCircle,
	intersectLineSegmentLineSegment,
	mapObjectMapValues,
	objectMapEntries,
	toDomPrecision,
	useIsEditing,
} from '@tldraw/editor'
import React from 'react'
import { ShapeFill, getShapeFillSvg, useDefaultColorTheme } from '../shared/ShapeFill'
import { createTextSvgElementFromSpans } from '../shared/createTextSvgElementFromSpans'
import {
	ARROW_LABEL_FONT_SIZES,
	FONT_FAMILIES,
	LABEL_TO_ARROW_PADDING,
	STROKE_SIZES,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import {
	getFillDefForCanvas,
	getFillDefForExport,
	getFontDefForExport,
} from '../shared/defaultStyleDefs'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { getArrowheadPathForType } from './arrowheads'
import {
	getCurvedArrowHandlePath,
	getSolidCurvedArrowPath,
	getSolidStraightArrowPath,
	getStraightArrowHandlePath,
} from './arrowpaths'
import { ArrowTextLabel } from './components/ArrowTextLabel'

let globalRenderIndex = 0

export const ARROW_END_OFFSET = 0.1

enum ARROW_HANDLES {
	START = 'start',
	MIDDLE = 'middle',
	LABEL = 'middle-text',
	END = 'end',
}

/** @public */
export class ArrowShapeUtil extends ShapeUtil<TLArrowShape> {
	static override type = 'arrow' as const
	static override props = arrowShapeProps
	static override migrations = arrowShapeMigrations

	override canEdit = () => true
	override canBind = () => false
	override canSnap = () => false
	override hideResizeHandles: TLShapeUtilFlag<TLArrowShape> = () => true
	override hideRotateHandle: TLShapeUtilFlag<TLArrowShape> = () => true
	override hideSelectionBoundsBg: TLShapeUtilFlag<TLArrowShape> = () => true
	override hideSelectionBoundsFg: TLShapeUtilFlag<TLArrowShape> = () => true

	override getDefaultProps(): TLArrowShape['props'] {
		return {
			dash: 'draw',
			size: 'm',
			fill: 'none',
			color: 'black',
			labelColor: 'black',
			bend: 0,
			start: { type: 'point', x: 0, y: 0 },
			end: { type: 'point', x: 2, y: 0 },
			arrowheadStart: 'none',
			arrowheadEnd: 'arrow',
			text: '',
			labelPosition: 0.5,
			font: 'draw',
		}
	}

	getGeometry(shape: TLArrowShape) {
		const info = this.editor.getArrowInfo(shape)!

		const bodyGeom = info.isStraight
			? new Edge2d({
					start: Vec.From(info.start.point),
					end: Vec.From(info.end.point),
				})
			: new Arc2d({
					center: Vec.Cast(info.handleArc.center),
					radius: info.handleArc.radius,
					start: Vec.Cast(info.start.point),
					end: Vec.Cast(info.end.point),
					sweepFlag: info.bodyArc.sweepFlag,
					largeArcFlag: info.bodyArc.largeArcFlag,
				})

		let labelGeom: Rectangle2d | undefined

		if (shape.props.text.trim()) {
			const bodyBounds = bodyGeom.bounds

			const { w, h } = this.editor.textMeasure.measureText(shape.props.text, {
				...TEXT_PROPS,
				fontFamily: FONT_FAMILIES[shape.props.font],
				fontSize: ARROW_LABEL_FONT_SIZES[shape.props.size],
				maxWidth: null,
			})

			let width = w
			let height = h

			if (bodyBounds.width > bodyBounds.height) {
				width = Math.max(Math.min(w, 64), Math.min(bodyBounds.width - 64, w))

				const { w: squishedWidth, h: squishedHeight } = this.editor.textMeasure.measureText(
					shape.props.text,
					{
						...TEXT_PROPS,
						fontFamily: FONT_FAMILIES[shape.props.font],
						fontSize: ARROW_LABEL_FONT_SIZES[shape.props.size],
						maxWidth: width,
					}
				)

				width = squishedWidth
				height = squishedHeight
			}

			if (width > 16 * ARROW_LABEL_FONT_SIZES[shape.props.size]) {
				width = 16 * ARROW_LABEL_FONT_SIZES[shape.props.size]

				const { w: squishedWidth, h: squishedHeight } = this.editor.textMeasure.measureText(
					shape.props.text,
					{
						...TEXT_PROPS,
						fontFamily: FONT_FAMILIES[shape.props.font],
						fontSize: ARROW_LABEL_FONT_SIZES[shape.props.size],
						maxWidth: width,
					}
				)

				width = squishedWidth
				height = squishedHeight
			}

			const scaledLabelPosition = Vec.ScaleWithOrigin(
				info.end.point,
				shape.props.labelPosition,
				info.start.point
			)

			let labelLocation = scaledLabelPosition
			if (!info.isStraight && bodyGeom instanceof Arc2d) {
				const t = shape.props.labelPosition * bodyGeom.measure
				const angle = bodyGeom.angleStart + t
				labelLocation = getPointOnCircle(bodyGeom._center, bodyGeom.radius, angle)
			}

			const A_BIG_NUMBER = Math.pow(2, 16)
			const LABEL_PADDING = 4.25
			const labelHalfWidth = width / 2 + LABEL_PADDING
			const labelHalfHeight = height / 2 + LABEL_PADDING
			labelGeom = new Rectangle2d({
				x: labelLocation.x - labelHalfWidth,
				y: labelLocation.y - labelHalfHeight,
				width: width + LABEL_PADDING * 2,
				height: height + LABEL_PADDING * 2,
				isFilled: true,
				isLabel: true,
			})

			const strokeWidth = STROKE_SIZES[shape.props.size]
			const labelToArrowPadding =
				LABEL_TO_ARROW_PADDING +
				(strokeWidth - STROKE_SIZES.s) * 2 +
				(strokeWidth === STROKE_SIZES.xl ? 20 : 0)

			// This logic is to make sure that the labels have fixed padding between them and the arrowhead.
			if (info.isStraight) {
				// First, get offset points from the arrowheads.
				const startOffset = Vec.AddDistance(info.start.point, info.end.point, labelToArrowPadding)
				const endOffset = Vec.AddDistance(info.end.point, info.start.point, labelToArrowPadding)
				const directionX = startOffset.x < endOffset.x ? 1 : -1
				const directionY = startOffset.y < endOffset.y ? 1 : -1

				// Draw lines away from the offset points based on width and height of the label.
				const startOffsetAndHalfWidthAway = new Vec(
					startOffset.x + directionX * labelHalfWidth,
					startOffset.y
				)
				const endOffsetAndHalfWidthAway = new Vec(
					endOffset.x + -1 * directionX * labelHalfWidth,
					endOffset.y
				)
				const startOffsetAndHalfHeightAway = new Vec(
					startOffset.x,
					startOffset.y + directionY * labelHalfHeight
				)
				const endOffsetAndHalfHeightAway = new Vec(
					endOffset.x,
					endOffset.y + -1 * directionY * labelHalfHeight
				)

				// Then, we use perpendicular lines from the those new points and see where they intersect with the arrow.
				const startLabelConstraintUsingWidth = intersectLineSegmentLineSegment(
					new Vec(startOffsetAndHalfWidthAway.x, -A_BIG_NUMBER),
					new Vec(startOffsetAndHalfWidthAway.x, A_BIG_NUMBER),
					info.start.point,
					info.end.point
				)
				const endLabelConstraintUsingWidth = intersectLineSegmentLineSegment(
					new Vec(endOffsetAndHalfWidthAway.x, -A_BIG_NUMBER),
					new Vec(endOffsetAndHalfWidthAway.x, A_BIG_NUMBER),
					info.start.point,
					info.end.point
				)
				const startLabelConstraintUsingHeight = intersectLineSegmentLineSegment(
					new Vec(-A_BIG_NUMBER, startOffsetAndHalfHeightAway.y),
					new Vec(A_BIG_NUMBER, startOffsetAndHalfHeightAway.y),
					info.start.point,
					info.end.point
				)
				const endLabelConstraintUsingHeight = intersectLineSegmentLineSegment(
					new Vec(-A_BIG_NUMBER, endOffsetAndHalfHeightAway.y),
					new Vec(A_BIG_NUMBER, endOffsetAndHalfHeightAway.y),
					info.start.point,
					info.end.point
				)

				// Finally, use the closer of the two intersection points.
				const startConstraint = (
					(startLabelConstraintUsingWidth &&
						startLabelConstraintUsingHeight &&
						Vec.Dist(startLabelConstraintUsingWidth, startOffset) <
							Vec.Dist(startLabelConstraintUsingHeight, startOffset)) ||
					!startLabelConstraintUsingHeight
						? startLabelConstraintUsingWidth
						: startLabelConstraintUsingHeight
				)!
				const endConstraint = (
					(endLabelConstraintUsingWidth &&
						endLabelConstraintUsingHeight &&
						Vec.Dist(endLabelConstraintUsingWidth, endOffset) <
							Vec.Dist(endLabelConstraintUsingHeight, endOffset)) ||
					!endLabelConstraintUsingHeight
						? endLabelConstraintUsingWidth
						: endLabelConstraintUsingHeight
				)!
				const xLocation = labelLocation.x - labelHalfWidth
				const yLocation = labelLocation.y - labelHalfHeight
				labelGeom = new Rectangle2d({
					x: clamp(
						xLocation,
						Math.min(startConstraint.x, endConstraint.x) - labelHalfWidth,
						Math.max(startConstraint.x, endConstraint.x) - labelHalfWidth
					),
					y: clamp(
						yLocation,
						Math.min(startConstraint.y, endConstraint.y) - labelHalfHeight,
						Math.max(startConstraint.y, endConstraint.y) - labelHalfHeight
					),
					width: width + LABEL_PADDING * 2,
					height: height + LABEL_PADDING * 2,
					isFilled: true,
					isLabel: true,
				})
			} else if (bodyGeom instanceof Arc2d) {
				// First, get offset points from the arrowheads on the arc.
				const direction = shape.props.bend < 0 ? 1 : -1
				const startOffsetAngle =
					bodyGeom.angleStart + (direction * labelToArrowPadding) / info.handleArc.radius
				const endOffsetAngle =
					bodyGeom.angleEnd + (-1 * direction * labelToArrowPadding) / info.handleArc.radius
				const startOffset = getPointOnCircle(
					info.handleArc.center,
					info.handleArc.radius,
					startOffsetAngle
				)
				const endOffset = getPointOnCircle(
					info.handleArc.center,
					info.handleArc.radius,
					endOffsetAngle
				)
				const startDirectionX = info.start.point.x < startOffset.x ? 1 : -1
				const startDirectionY = info.start.point.y < startOffset.y ? 1 : -1
				const endDirectionX = info.end.point.x < endOffset.x ? 1 : -1
				const endDirectionY = info.end.point.y < endOffset.y ? 1 : -1

				// Draw lines away from the offset points based on width and height of the label.
				const startOffsetAndHalfWidthAway = new Vec(
					startOffset.x + startDirectionX * labelHalfWidth,
					startOffset.y
				)
				const endOffsetAndHalfWidthAway = new Vec(
					endOffset.x + endDirectionX * labelHalfWidth,
					endOffset.y
				)
				const startOffsetAndHalfHeightAway = new Vec(
					startOffset.x,
					startOffset.y + startDirectionY * labelHalfHeight
				)
				const endOffsetAndHalfHeightAway = new Vec(
					endOffset.x,
					endOffset.y + endDirectionY * labelHalfHeight
				)

				const getClosest = (intersections: VecLike[] | null, offsetPoint: Vec) => {
					if (!intersections) {
						return null
					}

					const sortedByDistance = intersections.sort(
						(a, b) => Vec.Dist(a, offsetPoint) - Vec.Dist(b, offsetPoint)
					)
					return sortedByDistance[0]
				}

				// Then, we use perpendicular lines from the those new points and see where they intersect with the arrow.
				const startLabelConstraintUsingWidth = getClosest(
					intersectLineSegmentCircle(
						new Vec(startOffsetAndHalfWidthAway.x, -A_BIG_NUMBER),
						new Vec(startOffsetAndHalfWidthAway.x, A_BIG_NUMBER),
						info.handleArc.center,
						info.handleArc.radius
					),
					startOffset
				)
				const endLabelConstraintUsingWidth = getClosest(
					intersectLineSegmentCircle(
						new Vec(endOffsetAndHalfWidthAway.x, -A_BIG_NUMBER),
						new Vec(endOffsetAndHalfWidthAway.x, A_BIG_NUMBER),
						info.handleArc.center,
						info.handleArc.radius
					),
					endOffset
				)
				const startLabelConstraintUsingHeight = getClosest(
					intersectLineSegmentCircle(
						new Vec(-A_BIG_NUMBER, startOffsetAndHalfHeightAway.y),
						new Vec(A_BIG_NUMBER, startOffsetAndHalfHeightAway.y),
						info.handleArc.center,
						info.handleArc.radius
					),
					startOffset
				)
				const endLabelConstraintUsingHeight = getClosest(
					intersectLineSegmentCircle(
						new Vec(-A_BIG_NUMBER, endOffsetAndHalfHeightAway.y),
						new Vec(A_BIG_NUMBER, endOffsetAndHalfHeightAway.y),
						info.handleArc.center,
						info.handleArc.radius
					),
					endOffset
				)

				// Finally, Use the closer of the two intersection points.
				const startConstraint = (
					(startLabelConstraintUsingWidth &&
						startLabelConstraintUsingHeight &&
						Vec.Dist(startLabelConstraintUsingWidth, startOffset) <
							Vec.Dist(startLabelConstraintUsingHeight, startOffset)) ||
					!startLabelConstraintUsingHeight
						? startLabelConstraintUsingWidth
						: startLabelConstraintUsingHeight
				)!
				const endConstraint = (
					(endLabelConstraintUsingWidth &&
						endLabelConstraintUsingHeight &&
						Vec.Dist(endLabelConstraintUsingWidth, endOffset) <
							Vec.Dist(endLabelConstraintUsingHeight, endOffset)) ||
					!endLabelConstraintUsingHeight
						? endLabelConstraintUsingWidth
						: endLabelConstraintUsingHeight
				)!
				const xLocation = labelLocation.x - labelHalfWidth
				const yLocation = labelLocation.y - labelHalfHeight
				const closeToStartEndpoint = Vec.Dist(labelLocation, startOffset) < 100
				const closeToEndpoint = Vec.Dist(labelLocation, endOffset) < 100
				const xFn =
					(closeToStartEndpoint && startDirectionX === 1) ||
					(closeToEndpoint && endDirectionX === 1)
						? 'max'
						: 'min'
				const yFn =
					(closeToStartEndpoint && startDirectionY === 1) ||
					(closeToEndpoint && endDirectionY === 1)
						? 'max'
						: 'min'
				const labelXConstraint =
					(closeToStartEndpoint ? startConstraint.x : endConstraint.x) - labelHalfWidth
				const labelYConstraint =
					(closeToStartEndpoint ? startConstraint.y : endConstraint.y) - labelHalfHeight
				const isNearAnEndpoint = closeToStartEndpoint || closeToEndpoint
				const isAtFinalXPosition =
					isNearAnEndpoint && Math[xFn](xLocation, labelXConstraint) === labelXConstraint
				const isAtFinalYPosition =
					isNearAnEndpoint && Math[yFn](yLocation, labelYConstraint) === labelYConstraint

				let x, y
				if (isNearAnEndpoint) {
					if (isAtFinalYPosition) {
						x = labelXConstraint
					} else {
						x = Math[xFn](xLocation, labelXConstraint)
					}

					if (isAtFinalXPosition) {
						y = labelYConstraint
					} else {
						y = Math[yFn](yLocation, labelYConstraint)
					}
				} else {
					x = xLocation
					y = yLocation
				}
				labelGeom = new Rectangle2d({
					x,
					y,
					width: width + LABEL_PADDING * 2,
					height: height + LABEL_PADDING * 2,
					isFilled: true,
					isLabel: true,
				})
			}
		}

		return new Group2d({
			children: labelGeom ? [bodyGeom, labelGeom] : [bodyGeom],
			isSnappable: false,
		})
	}

	private getLength(shape: TLArrowShape): number {
		const info = this.editor.getArrowInfo(shape)!

		return info.isStraight
			? Vec.Dist(info.start.handle, info.end.handle)
			: Math.abs(info.handleArc.length)
	}

	override getHandles(shape: TLArrowShape): TLHandle[] {
		const info = this.editor.getArrowInfo(shape)!

		const hasText = shape.props.text.trim()
		const labelGeometry = hasText
			? (this.editor.getShapeGeometry<Group2d>(shape).children[1] as Rectangle2d)
			: null

		return [
			{
				id: ARROW_HANDLES.START,
				type: 'vertex',
				index: 'a0',
				x: info.start.handle.x,
				y: info.start.handle.y,
				canBind: true,
			},
			{
				id: ARROW_HANDLES.MIDDLE,
				type: 'virtual',
				index: 'a2',
				x: info.middle.x,
				y: info.middle.y,
				canBind: false,
			},
			labelGeometry && {
				id: ARROW_HANDLES.LABEL,
				type: 'text-adjust',
				index: 'a4',
				x: labelGeometry.x,
				y: labelGeometry.y,
				w: labelGeometry.w,
				h: labelGeometry.h,
				canBind: false,
			},
			{
				id: ARROW_HANDLES.END,
				type: 'vertex',
				index: 'a3',
				x: info.end.handle.x,
				y: info.end.handle.y,
				canBind: true,
			},
		].filter(Boolean) as TLHandle[]
	}

	override onHandleChange: TLOnHandleChangeHandler<TLArrowShape> = (
		shape,
		{ handle, isPrecise }
	) => {
		const handleId = handle.id as ARROW_HANDLES

		if (handleId === ARROW_HANDLES.MIDDLE) {
			// Bending the arrow...
			const { start, end } = getArrowTerminalsInArrowSpace(this.editor, shape)

			const delta = Vec.Sub(end, start)
			const v = Vec.Per(delta)

			const med = Vec.Med(end, start)
			const A = Vec.Sub(med, v)
			const B = Vec.Add(med, v)

			const point = Vec.NearestPointOnLineSegment(A, B, handle, false)
			let bend = Vec.Dist(point, med)
			if (Vec.Clockwise(point, end, med)) bend *= -1
			return { id: shape.id, type: shape.type, props: { bend } }
		}

		// This is for moving the text label to a different position on the arrow.
		if (handleId === ARROW_HANDLES.LABEL) {
			const next = deepCopy(shape) as TLArrowShape
			const info = this.editor.getArrowInfo(shape)!

			const geometry = this.editor.getShapeGeometry<Group2d>(shape)
			const labelGeometry = geometry.children[1] as Rectangle2d
			const lineGeometry = geometry.children[0] as Geometry2d
			const pointInShapeSpace = this.editor.getPointInShapeSpace(
				shape,
				this.editor.inputs.currentPagePoint
			)
			const handleOffset = new Vec(0, labelGeometry.h / 2)
			const nearestPoint = lineGeometry.nearestPoint(Vec.Add(pointInShapeSpace, handleOffset))

			let nextLabelPosition
			if (info.isStraight) {
				const lineLength = Vec.Dist(info.start.point, info.end.point)
				const segmentLength = Vec.Dist(info.end.point, nearestPoint)
				nextLabelPosition = 1 - segmentLength / lineLength
			} else {
				const isClockwise = shape.props.bend < 0
				const distFn = isClockwise ? clockwiseAngleDist : counterClockwiseAngleDist

				const angleCenterNearestPoint = Vec.Angle(info.handleArc.center, nearestPoint)
				const angleCenterStart = Vec.Angle(info.handleArc.center, info.start.point)
				const angleCenterEnd = Vec.Angle(info.handleArc.center, info.end.point)
				const arcLength = distFn(angleCenterStart, angleCenterEnd)
				const segmentLength = distFn(angleCenterNearestPoint, angleCenterEnd)
				nextLabelPosition = 1 - segmentLength / arcLength
			}
			next.props.labelPosition = nextLabelPosition

			return next
		}

		// Start or end, pointing the arrow...

		const next = deepCopy(shape) as TLArrowShape

		if (this.editor.inputs.ctrlKey) {
			// todo: maybe double check that this isn't equal to the other handle too?
			// Skip binding
			next.props[handleId] = {
				type: 'point',
				x: handle.x,
				y: handle.y,
			}
			return next
		}

		const point = this.editor.getShapePageTransform(shape.id)!.applyToPoint(handle)

		const target = this.editor.getShapeAtPoint(point, {
			hitInside: true,
			hitFrameInside: true,
			margin: 0,
			filter: (targetShape) => {
				return !targetShape.isLocked && this.editor.getShapeUtil(targetShape).canBind(targetShape)
			},
		})

		if (!target) {
			// todo: maybe double check that this isn't equal to the other handle too?
			next.props[handleId] = {
				type: 'point',
				x: handle.x,
				y: handle.y,
			}
			return next
		}

		// we've got a target! the handle is being dragged over a shape, bind to it

		const targetGeometry = this.editor.getShapeGeometry(target)
		const targetBounds = Box.ZeroFix(targetGeometry.bounds)
		const pageTransform = this.editor.getShapePageTransform(next.id)!
		const pointInPageSpace = pageTransform.applyToPoint(handle)
		const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pointInPageSpace)

		let precise = isPrecise

		if (!precise) {
			// If we're switching to a new bound shape, then precise only if moving slowly
			const prevHandle = next.props[handleId]
			if (
				prevHandle.type === 'point' ||
				(prevHandle.type === 'binding' && target.id !== prevHandle.boundShapeId)
			) {
				precise = this.editor.inputs.pointerVelocity.len() < 0.5
			}
		}

		if (!isPrecise) {
			if (!targetGeometry.isClosed) {
				precise = true
			}

			// Double check that we're not going to be doing an imprecise snap on
			// the same shape twice, as this would result in a zero length line
			const otherHandle =
				next.props[handleId === ARROW_HANDLES.START ? ARROW_HANDLES.END : ARROW_HANDLES.START]
			if (
				otherHandle.type === 'binding' &&
				target.id === otherHandle.boundShapeId &&
				otherHandle.isPrecise
			) {
				precise = true
			}
		}

		const normalizedAnchor = {
			x: (pointInTargetSpace.x - targetBounds.minX) / targetBounds.width,
			y: (pointInTargetSpace.y - targetBounds.minY) / targetBounds.height,
		}

		if (precise) {
			// Turn off precision if we're within a certain distance to the center of the shape.
			// Funky math but we want the snap distance to be 4 at the minimum and either
			// 16 or 15% of the smaller dimension of the target shape, whichever is smaller
			if (
				Vec.Dist(pointInTargetSpace, targetBounds.center) <
				Math.max(4, Math.min(Math.min(targetBounds.width, targetBounds.height) * 0.15, 16)) /
					this.editor.getZoomLevel()
			) {
				normalizedAnchor.x = 0.5
				normalizedAnchor.y = 0.5
			}
		}

		next.props[handleId] = {
			type: 'binding',
			boundShapeId: target.id,
			normalizedAnchor: normalizedAnchor,
			isPrecise: precise,
			isExact: this.editor.inputs.altKey,
		}

		if (next.props.start.type === 'binding' && next.props.end.type === 'binding') {
			if (next.props.start.boundShapeId === next.props.end.boundShapeId) {
				if (Vec.Equals(next.props.start.normalizedAnchor, next.props.end.normalizedAnchor)) {
					next.props.end.normalizedAnchor.x += 0.05
				}
			}
		}

		return next
	}

	override onTranslateStart: TLOnTranslateStartHandler<TLArrowShape> = (shape) => {
		const startBindingId =
			shape.props.start.type === 'binding' ? shape.props.start.boundShapeId : null
		const endBindingId = shape.props.end.type === 'binding' ? shape.props.end.boundShapeId : null

		const terminalsInArrowSpace = getArrowTerminalsInArrowSpace(this.editor, shape)
		const shapePageTransform = this.editor.getShapePageTransform(shape.id)!

		// If at least one bound shape is in the selection, do nothing;
		// If no bound shapes are in the selection, unbind any bound shapes

		const selectedShapeIds = this.editor.getSelectedShapeIds()

		if (
			(startBindingId &&
				(selectedShapeIds.includes(startBindingId) ||
					this.editor.isAncestorSelected(startBindingId))) ||
			(endBindingId &&
				(selectedShapeIds.includes(endBindingId) || this.editor.isAncestorSelected(endBindingId)))
		) {
			return
		}

		let result = shape

		// When we start translating shapes, record where their bindings were in page space so we
		// can maintain them as we translate the arrow
		shapeAtTranslationStart.set(shape, {
			pagePosition: shapePageTransform.applyToPoint(shape),
			terminalBindings: mapObjectMapValues(terminalsInArrowSpace, (terminalName, point) => {
				const terminal = shape.props[terminalName]
				if (terminal.type !== 'binding') return null
				return {
					binding: terminal,
					shapePosition: point,
					pagePosition: shapePageTransform.applyToPoint(point),
				}
			}),
		})

		for (const handleName of [ARROW_HANDLES.START, ARROW_HANDLES.END] as const) {
			const terminal = shape.props[handleName]
			if (terminal.type !== 'binding') continue
			result = {
				...shape,
				props: { ...shape.props, [handleName]: { ...terminal, isPrecise: true } },
			}
		}

		return result
	}

	override onTranslate?: TLOnTranslateHandler<TLArrowShape> = (initialShape, shape) => {
		const atTranslationStart = shapeAtTranslationStart.get(initialShape)
		if (!atTranslationStart) return

		const shapePageTransform = this.editor.getShapePageTransform(shape.id)!
		const pageDelta = Vec.Sub(
			shapePageTransform.applyToPoint(shape),
			atTranslationStart.pagePosition
		)

		let result = shape
		for (const [terminalName, terminalBinding] of objectMapEntries(
			atTranslationStart.terminalBindings
		)) {
			if (!terminalBinding) continue

			const newPagePoint = Vec.Add(terminalBinding.pagePosition, Vec.Mul(pageDelta, 0.5))
			const newTarget = this.editor.getShapeAtPoint(newPagePoint, {
				hitInside: true,
				hitFrameInside: true,
				margin: 0,
				filter: (targetShape) => {
					return !targetShape.isLocked && this.editor.getShapeUtil(targetShape).canBind(targetShape)
				},
			})

			if (newTarget?.id === terminalBinding.binding.boundShapeId) {
				const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(newTarget).bounds)
				const pointInTargetSpace = this.editor.getPointInShapeSpace(newTarget, newPagePoint)
				const normalizedAnchor = {
					x: (pointInTargetSpace.x - targetBounds.minX) / targetBounds.width,
					y: (pointInTargetSpace.y - targetBounds.minY) / targetBounds.height,
				}
				result = {
					...result,
					props: {
						...result.props,
						[terminalName]: { ...terminalBinding.binding, isPrecise: true, normalizedAnchor },
					},
				}
			} else {
				result = {
					...result,
					props: {
						...result.props,
						[terminalName]: {
							type: 'point',
							x: terminalBinding.shapePosition.x,
							y: terminalBinding.shapePosition.y,
						},
					},
				}
			}
		}

		return result
	}

	override onResize: TLOnResizeHandler<TLArrowShape> = (shape, info) => {
		const { scaleX, scaleY } = info

		const terminals = getArrowTerminalsInArrowSpace(this.editor, shape)

		const { start, end } = deepCopy<TLArrowShape['props']>(shape.props)
		let { bend } = shape.props

		// Rescale start handle if it's not bound to a shape
		if (start.type === 'point') {
			start.x = terminals.start.x * scaleX
			start.y = terminals.start.y * scaleY
		}

		// Rescale end handle if it's not bound to a shape
		if (end.type === 'point') {
			end.x = terminals.end.x * scaleX
			end.y = terminals.end.y * scaleY
		}

		// todo: we should only change the normalized anchor positions
		// of the shape's handles if the bound shape is also being resized

		const mx = Math.abs(scaleX)
		const my = Math.abs(scaleY)

		if (scaleX < 0 && scaleY >= 0) {
			if (bend !== 0) {
				bend *= -1
				bend *= Math.max(mx, my)
			}

			if (start.type === 'binding') {
				start.normalizedAnchor.x = 1 - start.normalizedAnchor.x
			}

			if (end.type === 'binding') {
				end.normalizedAnchor.x = 1 - end.normalizedAnchor.x
			}
		} else if (scaleX >= 0 && scaleY < 0) {
			if (bend !== 0) {
				bend *= -1
				bend *= Math.max(mx, my)
			}

			if (start.type === 'binding') {
				start.normalizedAnchor.y = 1 - start.normalizedAnchor.y
			}

			if (end.type === 'binding') {
				end.normalizedAnchor.y = 1 - end.normalizedAnchor.y
			}
		} else if (scaleX >= 0 && scaleY >= 0) {
			if (bend !== 0) {
				bend *= Math.max(mx, my)
			}
		} else if (scaleX < 0 && scaleY < 0) {
			if (bend !== 0) {
				bend *= Math.max(mx, my)
			}

			if (start.type === 'binding') {
				start.normalizedAnchor.x = 1 - start.normalizedAnchor.x
				start.normalizedAnchor.y = 1 - start.normalizedAnchor.y
			}

			if (end.type === 'binding') {
				end.normalizedAnchor.x = 1 - end.normalizedAnchor.x
				end.normalizedAnchor.y = 1 - end.normalizedAnchor.y
			}
		}

		const next = {
			props: {
				start,
				end,
				bend,
			},
		}

		return next
	}

	override onDoubleClickHandle = (
		shape: TLArrowShape,
		handle: TLHandle
	): TLShapePartial<TLArrowShape> | void => {
		switch (handle.id) {
			case ARROW_HANDLES.START: {
				return {
					id: shape.id,
					type: shape.type,
					props: {
						...shape.props,
						arrowheadStart: shape.props.arrowheadStart === 'none' ? 'arrow' : 'none',
					},
				}
			}
			case ARROW_HANDLES.END: {
				return {
					id: shape.id,
					type: shape.type,
					props: {
						...shape.props,
						arrowheadEnd: shape.props.arrowheadEnd === 'none' ? 'arrow' : 'none',
					},
				}
			}
		}
	}

	component(shape: TLArrowShape) {
		// Not a class component, but eslint can't tell that :(
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()
		const onlySelectedShape = this.editor.getOnlySelectedShape()

		const shouldDisplayHandles =
			this.editor.isInAny(
				'select.idle',
				'select.pointing_handle',
				'select.dragging_handle',
				'select.translating',
				'arrow.dragging'
			) && !this.editor.getInstanceState().isReadonly

		const info = this.editor.getArrowInfo(shape)
		const bounds = Box.ZeroFix(this.editor.getShapeGeometry(shape).bounds)

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const changeIndex = React.useMemo<number>(() => {
			return this.editor.environment.isSafari ? (globalRenderIndex += 1) : 0
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [shape])

		if (!info?.isValid) return null

		const strokeWidth = STROKE_SIZES[shape.props.size]

		const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
		const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

		const path = info.isStraight ? getSolidStraightArrowPath(info) : getSolidCurvedArrowPath(info)

		let handlePath: null | React.JSX.Element = null

		if (onlySelectedShape === shape && shouldDisplayHandles) {
			const sw = 2
			const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(this.getLength(shape), sw, {
				end: 'skip',
				start: 'skip',
				lengthRatio: 2.5,
			})

			handlePath =
				shape.props.start.type === 'binding' || shape.props.end.type === 'binding' ? (
					<path
						className="tl-arrow-hint"
						d={info.isStraight ? getStraightArrowHandlePath(info) : getCurvedArrowHandlePath(info)}
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
						strokeWidth={sw}
						markerStart={
							shape.props.start.type === 'binding'
								? shape.props.start.isExact
									? ''
									: shape.props.start.isPrecise
										? 'url(#arrowhead-cross)'
										: 'url(#arrowhead-dot)'
								: ''
						}
						markerEnd={
							shape.props.end.type === 'binding'
								? shape.props.end.isExact
									? ''
									: shape.props.end.isPrecise
										? 'url(#arrowhead-cross)'
										: 'url(#arrowhead-dot)'
								: ''
						}
						opacity={0.16}
					/>
				) : null
		}

		const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
			info.isStraight ? info.length : Math.abs(info.bodyArc.length),
			strokeWidth,
			{
				style: shape.props.dash,
			}
		)

		const labelGeometry = shape.props.text.trim()
			? (this.editor.getShapeGeometry<Group2d>(shape).children[1] as Rectangle2d)
			: null

		const maskStartArrowhead = !(
			info.start.arrowhead === 'none' || info.start.arrowhead === 'arrow'
		)
		const maskEndArrowhead = !(info.end.arrowhead === 'none' || info.end.arrowhead === 'arrow')

		// NOTE: I know right setting `changeIndex` hacky-as right! But we need this because otherwise safari loses
		// the mask, see <https://linear.app/tldraw/issue/TLD-1500/changing-arrow-color-makes-line-pass-through-text>
		const maskId = (shape.id + '_clip_' + changeIndex).replace(':', '_')

		return (
			<>
				<SVGContainer id={shape.id} style={{ minWidth: 50, minHeight: 50 }}>
					{/* Yep */}
					<defs>
						<mask id={maskId}>
							<rect
								x={toDomPrecision(-100 + bounds.minX)}
								y={toDomPrecision(-100 + bounds.minY)}
								width={toDomPrecision(bounds.width + 200)}
								height={toDomPrecision(bounds.height + 200)}
								fill="white"
							/>
							{labelGeometry && (
								<rect
									x={labelGeometry.x}
									y={labelGeometry.y}
									width={labelGeometry.w}
									height={labelGeometry.h}
									fill="black"
									rx={4}
									ry={4}
								/>
							)}
							{as && maskStartArrowhead && (
								<path
									d={as}
									fill={info.start.arrowhead === 'arrow' ? 'none' : 'black'}
									stroke="none"
								/>
							)}
							{ae && maskEndArrowhead && (
								<path
									d={ae}
									fill={info.end.arrowhead === 'arrow' ? 'none' : 'black'}
									stroke="none"
								/>
							)}
						</mask>
					</defs>
					<g
						fill="none"
						stroke={theme[shape.props.color].solid}
						strokeWidth={strokeWidth}
						strokeLinejoin="round"
						strokeLinecap="round"
						pointerEvents="none"
					>
						{handlePath}
						{/* firefox will clip if you provide a maskURL even if there is no mask matching that URL in the DOM */}
						<g mask={`url(#${maskId})`}>
							<rect
								x={toDomPrecision(bounds.minX - 100)}
								y={toDomPrecision(bounds.minY - 100)}
								width={toDomPrecision(bounds.width + 200)}
								height={toDomPrecision(bounds.height + 200)}
								opacity={0}
							/>
							<path
								d={path}
								strokeDasharray={strokeDasharray}
								strokeDashoffset={strokeDashoffset}
							/>
						</g>
						{as && maskStartArrowhead && shape.props.fill !== 'none' && (
							<ShapeFill theme={theme} d={as} color={shape.props.color} fill={shape.props.fill} />
						)}
						{ae && maskEndArrowhead && shape.props.fill !== 'none' && (
							<ShapeFill theme={theme} d={ae} color={shape.props.color} fill={shape.props.fill} />
						)}
						{as && <path d={as} />}
						{ae && <path d={ae} />}
					</g>
				</SVGContainer>
				<ArrowTextLabel
					id={shape.id}
					text={shape.props.text}
					font={shape.props.font}
					size={shape.props.size}
					position={
						labelGeometry
							? new Vec(
									labelGeometry.x + labelGeometry.w / 2,
									labelGeometry.y + labelGeometry.h / 2
								)
							: info.middle
					}
					width={labelGeometry?.w ?? 0}
					labelColor={theme[shape.props.labelColor].solid}
				/>
			</>
		)
	}

	indicator(shape: TLArrowShape) {
		const { start, end } = getArrowTerminalsInArrowSpace(this.editor, shape)

		const info = this.editor.getArrowInfo(shape)
		const geometry = this.editor.getShapeGeometry<Group2d>(shape)
		const bounds = geometry.bounds

		const labelGeometry = shape.props.text.trim() ? (geometry.children[1] as Rectangle2d) : null

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isEditing = useIsEditing(shape.id)

		if (!info) return null
		if (Vec.Equals(start, end)) return null

		const strokeWidth = STROKE_SIZES[shape.props.size]

		const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
		const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

		const path = info.isStraight ? getSolidStraightArrowPath(info) : getSolidCurvedArrowPath(info)

		const includeMask =
			(as && info.start.arrowhead !== 'arrow') ||
			(ae && info.end.arrowhead !== 'arrow') ||
			!!labelGeometry

		const maskId = (shape.id + '_clip').replace(':', '_')

		if (isEditing && labelGeometry) {
			return (
				<rect
					x={toDomPrecision(labelGeometry.x)}
					y={toDomPrecision(labelGeometry.y)}
					width={labelGeometry.w}
					height={labelGeometry.h}
					rx={3.5}
					ry={3.5}
				/>
			)
		}

		return (
			<g>
				{includeMask && (
					<defs>
						<mask id={maskId}>
							<rect
								x={bounds.minX - 100}
								y={bounds.minY - 100}
								width={bounds.w + 200}
								height={bounds.h + 200}
								fill="white"
							/>
							{labelGeometry && (
								<rect
									x={toDomPrecision(labelGeometry.x)}
									y={toDomPrecision(labelGeometry.y)}
									width={labelGeometry.w}
									height={labelGeometry.h}
									fill="black"
									rx={3.5}
									ry={3.5}
								/>
							)}
							{as && (
								<path
									d={as}
									fill={info.start.arrowhead === 'arrow' ? 'none' : 'black'}
									stroke="none"
								/>
							)}
							{ae && (
								<path
									d={ae}
									fill={info.end.arrowhead === 'arrow' ? 'none' : 'black'}
									stroke="none"
								/>
							)}
						</mask>
					</defs>
				)}
				{/* firefox will clip if you provide a maskURL even if there is no mask matching that URL in the DOM */}
				<g {...(includeMask ? { mask: `url(#${maskId})` } : undefined)}>
					{/* This rect needs to be here if we're creating a mask due to an svg quirk on Chrome */}
					{includeMask && (
						<rect
							x={bounds.minX - 100}
							y={bounds.minY - 100}
							width={bounds.width + 200}
							height={bounds.height + 200}
							opacity={0}
						/>
					)}

					<path d={path} />
				</g>
				{as && <path d={as} />}
				{ae && <path d={ae} />}
				{labelGeometry && (
					<rect
						x={toDomPrecision(labelGeometry.x)}
						y={toDomPrecision(labelGeometry.y)}
						width={labelGeometry.w}
						height={labelGeometry.h}
						rx={3.5}
						ry={3.5}
					/>
				)}
			</g>
		)
	}

	override onEditEnd: TLOnEditEndHandler<TLArrowShape> = (shape) => {
		const {
			id,
			type,
			props: { text },
		} = shape

		if (text.trimEnd() !== shape.props.text) {
			this.editor.updateShapes<TLArrowShape>([
				{
					id,
					type,
					props: {
						text: text.trimEnd(),
					},
				},
			])
		}
	}

	override toSvg(shape: TLArrowShape, ctx: SvgExportContext) {
		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })
		ctx.addExportDef(getFillDefForExport(shape.props.fill, theme))

		const color = theme[shape.props.color].solid

		const info = this.editor.getArrowInfo(shape)

		const strokeWidth = STROKE_SIZES[shape.props.size]

		// Group for arrow
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		if (!info) return g

		// Arrowhead start path
		const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
		// Arrowhead end path
		const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

		const geometry = this.editor.getShapeGeometry<Group2d>(shape)
		const bounds = geometry.bounds

		const labelGeometry = shape.props.text.trim() ? (geometry.children[1] as Rectangle2d) : null

		const maskId = (shape.id + '_clip').replace(':', '_')

		// If we have any arrowheads, then mask the arrowheads
		if (as || ae || !!labelGeometry) {
			// Create mask for arrowheads

			// Create defs
			const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')

			// Create mask
			const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask')
			mask.id = maskId

			// Create large white shape for mask
			const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
			rect.setAttribute('x', bounds.minX - 100 + '')
			rect.setAttribute('y', bounds.minY - 100 + '')
			rect.setAttribute('width', bounds.width + 200 + '')
			rect.setAttribute('height', bounds.height + 200 + '')
			rect.setAttribute('fill', 'white')
			mask.appendChild(rect)

			// add arrowhead start mask
			if (as) mask.appendChild(getArrowheadSvgMask(as, info.start.arrowhead))

			// add arrowhead end mask
			if (ae) mask.appendChild(getArrowheadSvgMask(ae, info.end.arrowhead))

			// Mask out text label if text is present
			if (labelGeometry) {
				const labelMask = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
				labelMask.setAttribute('x', labelGeometry.x + '')
				labelMask.setAttribute('y', labelGeometry.y + '')
				labelMask.setAttribute('width', labelGeometry.w + '')
				labelMask.setAttribute('height', labelGeometry.h + '')
				labelMask.setAttribute('fill', 'black')

				mask.appendChild(labelMask)
			}

			defs.appendChild(mask)
			g.appendChild(defs)
		}

		const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		g2.setAttribute('mask', `url(#${maskId})`)
		g.appendChild(g2)

		// Dumb mask fix thing
		const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect2.setAttribute('x', '-100')
		rect2.setAttribute('y', '-100')
		rect2.setAttribute('width', bounds.width + 200 + '')
		rect2.setAttribute('height', bounds.height + 200 + '')
		rect2.setAttribute('fill', 'transparent')
		rect2.setAttribute('stroke', 'none')
		g2.appendChild(rect2)

		// Arrowhead body path
		const path = getArrowSvgPath(
			info.isStraight ? getSolidStraightArrowPath(info) : getSolidCurvedArrowPath(info),
			color,
			strokeWidth
		)

		const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
			info.isStraight ? info.length : Math.abs(info.bodyArc.length),
			strokeWidth,
			{
				style: shape.props.dash,
			}
		)

		path.setAttribute('stroke-dasharray', strokeDasharray)
		path.setAttribute('stroke-dashoffset', strokeDashoffset)

		g2.appendChild(path)

		// Arrowhead start path
		if (as) {
			g.appendChild(
				getArrowheadSvgPath(
					as,
					shape.props.color,
					strokeWidth,
					shape.props.arrowheadStart === 'arrow' ? 'none' : shape.props.fill,
					theme
				)
			)
		}
		// Arrowhead end path
		if (ae) {
			g.appendChild(
				getArrowheadSvgPath(
					ae,
					shape.props.color,
					strokeWidth,
					shape.props.arrowheadEnd === 'arrow' ? 'none' : shape.props.fill,
					theme
				)
			)
		}

		// Text Label
		if (labelGeometry) {
			ctx.addExportDef(getFontDefForExport(shape.props.font))

			const opts = {
				fontSize: ARROW_LABEL_FONT_SIZES[shape.props.size],
				lineHeight: TEXT_PROPS.lineHeight,
				fontFamily: DefaultFontFamilies[shape.props.font],
				padding: 0,
				textAlign: 'middle' as const,
				width: labelGeometry.w - 8,
				verticalTextAlign: 'middle' as const,
				height: labelGeometry.h,
				fontStyle: 'normal',
				fontWeight: 'normal',
				overflow: 'wrap' as const,
			}

			const textElm = createTextSvgElementFromSpans(
				this.editor,
				this.editor.textMeasure.measureTextSpans(shape.props.text, opts),
				opts
			)
			textElm.setAttribute('fill', theme[shape.props.labelColor].solid)

			const children = Array.from(textElm.children) as unknown as SVGTSpanElement[]

			children.forEach((child) => {
				const x = parseFloat(child.getAttribute('x') || '0')
				const y = parseFloat(child.getAttribute('y') || '0')

				child.setAttribute('x', x + 4 + labelGeometry.x + 'px')
				child.setAttribute('y', y + labelGeometry.y + 'px')
			})

			const textBgEl = textElm.cloneNode(true) as SVGTextElement
			textBgEl.setAttribute('stroke-width', '2')
			textBgEl.setAttribute('fill', theme.background)
			textBgEl.setAttribute('stroke', theme.background)

			g.appendChild(textBgEl)
			g.appendChild(textElm)
		}

		return g
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [getFillDefForCanvas()]
	}
}

function getArrowheadSvgMask(d: string, arrowhead: TLArrowShapeArrowheadStyle) {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	path.setAttribute('d', d)
	path.setAttribute('fill', arrowhead === 'arrow' ? 'none' : 'black')
	path.setAttribute('stroke', 'none')
	return path
}

function getArrowSvgPath(d: string, color: string, strokeWidth: number) {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	path.setAttribute('d', d)
	path.setAttribute('fill', 'none')
	path.setAttribute('stroke', color)
	path.setAttribute('stroke-width', strokeWidth + '')
	return path
}

function getArrowheadSvgPath(
	d: string,
	color: TLDefaultColorStyle,
	strokeWidth: number,
	fill: TLDefaultFillStyle,
	theme: TLDefaultColorTheme
) {
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	path.setAttribute('d', d)
	path.setAttribute('fill', 'none')
	path.setAttribute('stroke', theme[color].solid)
	path.setAttribute('stroke-width', strokeWidth + '')

	// Get the fill element, if any
	const shapeFill = getShapeFillSvg({
		d,
		fill,
		color,
		theme,
	})

	if (shapeFill) {
		// If there is a fill element, return a group containing the fill and the path
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		g.appendChild(shapeFill)
		g.appendChild(path)
		return g
	} else {
		// Otherwise, just return the path
		return path
	}
}

const shapeAtTranslationStart = new WeakMap<
	TLArrowShape,
	{
		pagePosition: Vec
		terminalBindings: Record<
			'start' | 'end',
			{
				pagePosition: Vec
				shapePosition: Vec
				binding: Extract<TLArrowShapeProps['start'], { type: 'binding' }>
			} | null
		>
	}
>()
