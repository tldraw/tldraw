import {
	Arc2d,
	Box,
	EMPTY_ARRAY,
	Edge2d,
	Editor,
	Geometry2d,
	Group2d,
	IndexKey,
	PI2,
	Polyline2d,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	SvgExportContext,
	TLArrowBinding,
	TLArrowBindingProps,
	TLArrowShape,
	TLArrowShapeProps,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	TLShapePartial,
	TLShapeUtilCanBeLaidOutOpts,
	TLShapeUtilCanBindOpts,
	TLShapeUtilCanvasSvgDef,
	Vec,
	WeakCache,
	arrowShapeMigrations,
	arrowShapeProps,
	clamp,
	debugFlags,
	exhaustiveSwitchError,
	getColorValue,
	getDefaultColorTheme,
	getFontsFromRichText,
	invLerp,
	lerp,
	mapObjectMapValues,
	maybeSnapToGrid,
	structuredClone,
	toDomPrecision,
	toRichText,
	track,
	useEditor,
	useIsEditing,
	useSharedSafeId,
	useValue,
} from '@tldraw/editor'
import React, { useMemo } from 'react'
import { updateArrowTerminal } from '../../bindings/arrow/ArrowBindingUtil'
import { isEmptyRichText, renderPlaintextFromRichText } from '../../utils/text/richText'
import { PathBuilder } from '../shared/PathBuilder'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import { ShapeFill } from '../shared/ShapeFill'
import { ARROW_LABEL_PADDING, STROKE_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { getArrowBodyPath, getArrowHandlePath } from './ArrowPath'
import { ArrowShapeOptions } from './arrow-types'
import {
	getArrowLabelDefaultPosition,
	getArrowLabelFontSize,
	getArrowLabelPosition,
} from './arrowLabel'
import { updateArrowTargetState } from './arrowTargetState'
import { getArrowheadPathForType } from './arrowheads'
import { ElbowArrowDebug } from './elbow/ElbowArrowDebug'
import { ElbowArrowAxes } from './elbow/definitions'
import { getElbowArrowSnapLines, perpDistanceToLineAngle } from './elbow/elbowArrowSnapLines'
import {
	TLArrowBindings,
	createOrUpdateArrowBinding,
	getArrowBindings,
	getArrowInfo,
	getArrowTerminalsInArrowSpace,
	removeArrowBinding,
} from './shared'

enum ArrowHandles {
	Start = 'start',
	Middle = 'middle',
	End = 'end',
}

/** @public */
export class ArrowShapeUtil extends ShapeUtil<TLArrowShape> {
	static override type = 'arrow' as const
	static override props = arrowShapeProps
	static override migrations = arrowShapeMigrations

	override options: ArrowShapeOptions = {
		expandElbowLegLength: {
			s: 28,
			m: 36,
			l: 44,
			xl: 66,
		},
		minElbowLegLength: {
			s: STROKE_SIZES.s * 3,
			m: STROKE_SIZES.m * 3,
			l: STROKE_SIZES.l * 3,
			xl: STROKE_SIZES.xl * 3,
		},
		minElbowHandleDistance: 16,

		arcArrowCenterSnapDistance: 16,
		elbowArrowCenterSnapDistance: 24,
		elbowArrowEdgeSnapDistance: 20,
		elbowArrowPointSnapDistance: 24,
		elbowArrowAxisSnapDistance: 16,

		labelCenterSnapDistance: 10,

		elbowMidpointSnapDistance: 10,
		elbowMinSegmentLengthToShowMidpointHandle: 20,

		hoverPreciseTimeout: 600,
		pointingPreciseTimeout: 320,

		shouldBeExact: (editor: Editor) => editor.inputs.altKey,
		shouldIgnoreTargets: (editor: Editor) => editor.inputs.ctrlKey,
	}

	override canEdit() {
		return true
	}
	override canBind({ toShapeType }: TLShapeUtilCanBindOpts<TLArrowShape>): boolean {
		// bindings can go from arrows to shapes, but not from shapes to arrows
		return toShapeType !== 'arrow'
	}
	override canSnap() {
		return false
	}
	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}
	override hideInMinimap() {
		return true
	}

	override canBeLaidOut(shape: TLArrowShape, info: TLShapeUtilCanBeLaidOutOpts) {
		if (info.type === 'flip') {
			// If we don't have this then the flip will be non-idempotent; that is, the flip will be multipotent, varipotent, or perhaps even omni-potent... and we can't have that
			const bindings = getArrowBindings(this.editor, shape)
			const { start, end } = bindings
			const { shapes = [] } = info
			if (start && !shapes.find((s) => s.id === start.toId)) return false
			if (end && !shapes.find((s) => s.id === end.toId)) return false
		}
		return true
	}

	override getFontFaces(shape: TLArrowShape) {
		if (isEmptyRichText(shape.props.richText)) return EMPTY_ARRAY

		return getFontsFromRichText(this.editor, shape.props.richText, {
			family: `tldraw_${shape.props.font}`,
			weight: 'normal',
			style: 'normal',
		})
	}

	override getDefaultProps(): TLArrowShape['props'] {
		return {
			kind: 'arc',
			elbowMidPoint: 0.5,
			dash: 'draw',
			size: 'm',
			fill: 'none',
			color: 'black',
			labelColor: 'black',
			bend: 0,
			start: { x: 0, y: 0 },
			end: { x: 2, y: 0 },
			arrowheadStart: 'none',
			arrowheadEnd: 'arrow',
			richText: toRichText(''),
			labelPosition: 0.5,
			font: 'draw',
			scale: 1,
		}
	}

	getGeometry(shape: TLArrowShape) {
		const isEditing = this.editor.getEditingShapeId() === shape.id
		const info = getArrowInfo(this.editor, shape)!

		const debugGeom: Geometry2d[] = []

		const bodyGeom =
			info.type === 'straight'
				? new Edge2d({
						start: Vec.From(info.start.point),
						end: Vec.From(info.end.point),
					})
				: info.type === 'arc'
					? new Arc2d({
							center: Vec.Cast(info.handleArc.center),
							start: Vec.Cast(info.start.point),
							end: Vec.Cast(info.end.point),
							sweepFlag: info.bodyArc.sweepFlag,
							largeArcFlag: info.bodyArc.largeArcFlag,
						})
					: new Polyline2d({ points: info.route.points })

		let labelGeom
		if (isEditing || !isEmptyRichText(shape.props.richText)) {
			const labelPosition = getArrowLabelPosition(this.editor, shape)
			if (debugFlags.debugGeometry.get()) {
				debugGeom.push(...labelPosition.debugGeom)
			}
			labelGeom = new Rectangle2d({
				x: labelPosition.box.x,
				y: labelPosition.box.y,
				width: labelPosition.box.w,
				height: labelPosition.box.h,
				isFilled: true,
				isLabel: true,
			})
		}

		return new Group2d({
			children: [...(labelGeom ? [bodyGeom, labelGeom] : [bodyGeom]), ...debugGeom],
		})
	}

	override getHandles(shape: TLArrowShape): TLHandle[] {
		const info = getArrowInfo(this.editor, shape)!

		const handles: TLHandle[] = [
			{
				id: ArrowHandles.Start,
				type: 'vertex',
				index: 'a1' as IndexKey,
				x: info.start.handle.x,
				y: info.start.handle.y,
			},
			{
				id: ArrowHandles.End,
				type: 'vertex',
				index: 'a3' as IndexKey,
				x: info.end.handle.x,
				y: info.end.handle.y,
			},
		]

		if (shape.props.kind === 'arc' && (info.type === 'straight' || info.type === 'arc')) {
			handles.push({
				id: ArrowHandles.Middle,
				type: 'virtual',
				index: 'a2' as IndexKey,
				x: info.middle.x,
				y: info.middle.y,
			})
		}

		if (shape.props.kind === 'elbow' && info.type === 'elbow' && info.route.midpointHandle) {
			const shapePageTransform = this.editor.getShapePageTransform(shape.id)!

			const segmentStart = shapePageTransform.applyToPoint(info.route.midpointHandle.segmentStart)
			const segmentEnd = shapePageTransform.applyToPoint(info.route.midpointHandle.segmentEnd)
			const segmentLength = Vec.Dist(segmentStart, segmentEnd) * this.editor.getZoomLevel()

			if (segmentLength > this.options.elbowMinSegmentLengthToShowMidpointHandle) {
				handles.push({
					id: ArrowHandles.Middle,
					type: 'vertex',
					index: 'a2' as IndexKey,
					x: info.route.midpointHandle.point.x,
					y: info.route.midpointHandle.point.y,
				})
			}
		}

		return handles
	}

	override getText(shape: TLArrowShape) {
		return renderPlaintextFromRichText(this.editor, shape.props.richText)
	}

	override onHandleDrag(shape: TLArrowShape, info: TLHandleDragInfo<TLArrowShape>) {
		const handleId = info.handle.id as ArrowHandles
		switch (handleId) {
			case ArrowHandles.Middle:
				switch (shape.props.kind) {
					case 'arc':
						return this.onArcMidpointHandleDrag(shape, info)
					case 'elbow':
						return this.onElbowMidpointHandleDrag(shape, info)
					default:
						exhaustiveSwitchError(shape.props.kind)
				}
			case ArrowHandles.Start:
			case ArrowHandles.End:
				return this.onTerminalHandleDrag(shape, info, handleId)
			default:
				exhaustiveSwitchError(handleId)
		}
	}

	private onArcMidpointHandleDrag(shape: TLArrowShape, { handle }: TLHandleDragInfo<TLArrowShape>) {
		const bindings = getArrowBindings(this.editor, shape)

		// Bending the arrow...
		const { start, end } = getArrowTerminalsInArrowSpace(this.editor, shape, bindings)

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

	private onElbowMidpointHandleDrag(
		shape: TLArrowShape,
		{ handle }: TLHandleDragInfo<TLArrowShape>
	) {
		const info = getArrowInfo(this.editor, shape)
		if (info?.type !== 'elbow') return

		const shapeToPageTransform = this.editor.getShapePageTransform(shape.id)!
		const handlePagePoint = shapeToPageTransform.applyToPoint(handle)
		const axisName = info.route.midpointHandle?.axis
		if (!axisName) return
		const axis = ElbowArrowAxes[axisName]

		const midRange = info.elbow[axis.midRange]
		if (!midRange) return

		// We're snapping against a list of parallel lines. The way we do this is to calculate the
		// angle of the line we're snapping to...
		let angle = Vec.Angle(
			shapeToPageTransform.applyToPoint(axis.v(0, 0)),
			shapeToPageTransform.applyToPoint(axis.v(0, 1))
		)
		if (angle < 0) angle += Math.PI

		// ...then calculate the perpendicular distance from the origin to the (infinite) line in
		// question. This returns a signed distance - lines "behind" the origin are negative.
		const handlePoint = perpDistanceToLineAngle(handlePagePoint, angle)

		// As we're only ever moving along one dimension, we can use this perpendicular distance for
		// all of our snapping calculations.
		const loPoint = perpDistanceToLineAngle(
			shapeToPageTransform.applyToPoint(axis.v(midRange.lo, 0)),
			angle
		)
		const hiPoint = perpDistanceToLineAngle(
			shapeToPageTransform.applyToPoint(axis.v(midRange.hi, 0)),
			angle
		)

		// we want to snap to certain points. the maximum distance at which a snap will occur is
		// relative to the zoom level:
		const maxSnapDistance = this.options.elbowMidpointSnapDistance / this.editor.getZoomLevel()

		// we snap to the midpoint of the range by default
		const midPoint = perpDistanceToLineAngle(
			shapeToPageTransform.applyToPoint(axis.v(lerp(midRange.lo, midRange.hi, 0.5), 0)),
			angle
		)

		let snapPoint = midPoint
		let snapDistance = Math.abs(midPoint - handlePoint)

		// then we check all the other arrows that are on-screen.
		for (const [snapAngle, snapLines] of getElbowArrowSnapLines(this.editor)) {
			const { isParallel, isFlippedParallel } = anglesAreApproximatelyParallel(angle, snapAngle)
			if (isParallel || isFlippedParallel) {
				for (const snapLine of snapLines) {
					const doesShareStartIntersection =
						snapLine.startBoundShapeId &&
						(snapLine.startBoundShapeId === info.bindings.start?.toId ||
							snapLine.startBoundShapeId === info.bindings.end?.toId)

					const doesShareEndIntersection =
						snapLine.endBoundShapeId &&
						(snapLine.endBoundShapeId === info.bindings.start?.toId ||
							snapLine.endBoundShapeId === info.bindings.end?.toId)

					if (!doesShareStartIntersection && !doesShareEndIntersection) continue

					const point = isFlippedParallel ? -snapLine.perpDistance : snapLine.perpDistance
					const distance = Math.abs(point - handlePoint)
					if (distance < snapDistance) {
						snapPoint = point
						snapDistance = distance
					}
				}
			}
		}

		if (snapDistance > maxSnapDistance) {
			snapPoint = handlePoint
		}

		const newMid = clamp(invLerp(loPoint, hiPoint, snapPoint), 0, 1)

		return {
			id: shape.id,
			type: shape.type,
			props: {
				elbowMidPoint: newMid,
			},
		}
	}

	private onTerminalHandleDrag(
		shape: TLArrowShape,
		{ handle, isPrecise }: TLHandleDragInfo<TLArrowShape>,
		handleId: ArrowHandles.Start | ArrowHandles.End
	) {
		const bindings = getArrowBindings(this.editor, shape)

		const update: TLShapePartial<TLArrowShape> = { id: shape.id, type: 'arrow', props: {} }

		const currentBinding = bindings[handleId]

		const oppositeHandleId = handleId === ArrowHandles.Start ? ArrowHandles.End : ArrowHandles.Start
		const oppositeBinding = bindings[oppositeHandleId]

		const targetInfo = updateArrowTargetState({
			editor: this.editor,
			pointInPageSpace: this.editor.getShapePageTransform(shape.id)!.applyToPoint(handle),
			arrow: shape,
			isPrecise: isPrecise,
			currentBinding,
			oppositeBinding,
		})

		if (!targetInfo) {
			// todo: maybe double check that this isn't equal to the other handle too?
			removeArrowBinding(this.editor, shape, handleId)
			const newPoint = maybeSnapToGrid(new Vec(handle.x, handle.y), this.editor)
			update.props![handleId] = {
				x: newPoint.x,
				y: newPoint.y,
			}
			return update
		}

		// we've got a target! the handle is being dragged over a shape, bind to it
		const bindingProps: TLArrowBindingProps = {
			terminal: handleId,
			normalizedAnchor: targetInfo.normalizedAnchor,
			isPrecise: targetInfo.isPrecise,
			isExact: targetInfo.isExact,
			snap: targetInfo.snap,
		}

		createOrUpdateArrowBinding(this.editor, shape, targetInfo.target.id, bindingProps)

		const newBindings = getArrowBindings(this.editor, shape)
		if (newBindings.start && newBindings.end && newBindings.start.toId === newBindings.end.toId) {
			if (
				Vec.Equals(newBindings.start.props.normalizedAnchor, newBindings.end.props.normalizedAnchor)
			) {
				createOrUpdateArrowBinding(this.editor, shape, newBindings.end.toId, {
					...newBindings.end.props,
					normalizedAnchor: {
						x: newBindings.end.props.normalizedAnchor.x + 0.05,
						y: newBindings.end.props.normalizedAnchor.y,
					},
				})
			}
		}

		return update
	}

	override onTranslateStart(shape: TLArrowShape) {
		const bindings = getArrowBindings(this.editor, shape)

		// ...if the user is dragging ONLY this arrow, for elbow shapes, we can't maintain the bindings well just yet so we remove them entirely
		if (shape.props.kind === 'elbow' && this.editor.getOnlySelectedShapeId() === shape.id) {
			const info = getArrowInfo(this.editor, shape)
			if (!info) return
			const update: TLShapePartial<TLArrowShape> = { id: shape.id, type: 'arrow', props: {} }
			if (bindings.start) {
				update.props!.start = { x: info.start.point.x, y: info.start.point.y }
				removeArrowBinding(this.editor, shape, 'start')
			}
			if (bindings.end) {
				update.props!.end = { x: info.end.point.x, y: info.end.point.y }
				removeArrowBinding(this.editor, shape, 'end')
			}
			return update
		}

		const terminalsInArrowSpace = getArrowTerminalsInArrowSpace(this.editor, shape, bindings)
		const shapePageTransform = this.editor.getShapePageTransform(shape.id)!

		// If at least one bound shape is in the selection, do nothing;
		// If no bound shapes are in the selection, unbind any bound shapes

		const selectedShapeIds = this.editor.getSelectedShapeIds()

		if (
			(bindings.start &&
				(selectedShapeIds.includes(bindings.start.toId) ||
					this.editor.isAncestorSelected(bindings.start.toId))) ||
			(bindings.end &&
				(selectedShapeIds.includes(bindings.end.toId) ||
					this.editor.isAncestorSelected(bindings.end.toId)))
		) {
			return
		}

		// When we start translating shapes, record where their bindings were in page space so we
		// can maintain them as we translate the arrow
		shapeAtTranslationStart.set(shape, {
			pagePosition: shapePageTransform.applyToPoint(shape),
			terminalBindings: mapObjectMapValues(terminalsInArrowSpace, (terminalName, point) => {
				const binding = bindings[terminalName]
				if (!binding) return null
				return {
					binding,
					shapePosition: point,
					pagePosition: shapePageTransform.applyToPoint(point),
				}
			}),
		})

		// update arrow terminal bindings eagerly to make sure the arrows unbind nicely when translating
		if (bindings.start) {
			updateArrowTerminal({
				editor: this.editor,
				arrow: shape,
				terminal: 'start',
				useHandle: true,
			})
			shape = this.editor.getShape(shape.id) as TLArrowShape
		}
		if (bindings.end) {
			updateArrowTerminal({
				editor: this.editor,
				arrow: shape,
				terminal: 'end',
				useHandle: true,
			})
		}

		for (const handleName of [ArrowHandles.Start, ArrowHandles.End] as const) {
			const binding = bindings[handleName]
			if (!binding) continue

			this.editor.updateBinding({
				...binding,
				props: { ...binding.props, isPrecise: true },
			})
		}

		return
	}

	override onTranslate(initialShape: TLArrowShape, shape: TLArrowShape) {
		const atTranslationStart = shapeAtTranslationStart.get(initialShape)
		if (!atTranslationStart) return

		const shapePageTransform = this.editor.getShapePageTransform(shape.id)!
		const pageDelta = Vec.Sub(
			shapePageTransform.applyToPoint(shape),
			atTranslationStart.pagePosition
		)

		for (const terminalBinding of Object.values(atTranslationStart.terminalBindings)) {
			if (!terminalBinding) continue

			const newPagePoint = Vec.Add(terminalBinding.pagePosition, Vec.Mul(pageDelta, 0.5))
			const newTarget = this.editor.getShapeAtPoint(newPagePoint, {
				hitInside: true,
				hitFrameInside: true,
				margin: 0,
				filter: (targetShape) => {
					return (
						!targetShape.isLocked &&
						this.editor.canBindShapes({ fromShape: shape, toShape: targetShape, binding: 'arrow' })
					)
				},
			})

			if (newTarget?.id === terminalBinding.binding.toId) {
				const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(newTarget).bounds)
				const pointInTargetSpace = this.editor.getPointInShapeSpace(newTarget, newPagePoint)
				const normalizedAnchor = {
					x: (pointInTargetSpace.x - targetBounds.minX) / targetBounds.width,
					y: (pointInTargetSpace.y - targetBounds.minY) / targetBounds.height,
				}
				createOrUpdateArrowBinding(this.editor, shape, newTarget.id, {
					...terminalBinding.binding.props,
					normalizedAnchor,
					isPrecise: true,
				})
			} else {
				removeArrowBinding(this.editor, shape, terminalBinding.binding.props.terminal)
			}
		}
	}

	private readonly _resizeInitialBindings = new WeakCache<TLArrowShape, TLArrowBindings>()

	override onResize(shape: TLArrowShape, info: TLResizeInfo<TLArrowShape>) {
		const { scaleX, scaleY } = info

		const bindings = this._resizeInitialBindings.get(shape, () =>
			getArrowBindings(this.editor, shape)
		)
		const terminals = getArrowTerminalsInArrowSpace(this.editor, shape, bindings)

		const { start, end } = structuredClone<TLArrowShape['props']>(shape.props)
		let { bend } = shape.props

		// Rescale start handle if it's not bound to a shape
		if (!bindings.start) {
			start.x = terminals.start.x * scaleX
			start.y = terminals.start.y * scaleY
		}

		// Rescale end handle if it's not bound to a shape
		if (!bindings.end) {
			end.x = terminals.end.x * scaleX
			end.y = terminals.end.y * scaleY
		}

		// todo: we should only change the normalized anchor positions
		// of the shape's handles if the bound shape is also being resized

		const mx = Math.abs(scaleX)
		const my = Math.abs(scaleY)

		const startNormalizedAnchor = bindings?.start
			? Vec.From(bindings.start.props.normalizedAnchor)
			: null
		const endNormalizedAnchor = bindings?.end ? Vec.From(bindings.end.props.normalizedAnchor) : null

		if (scaleX < 0 && scaleY >= 0) {
			if (bend !== 0) {
				bend *= -1
				bend *= Math.max(mx, my)
			}

			if (startNormalizedAnchor) {
				startNormalizedAnchor.x = 1 - startNormalizedAnchor.x
			}

			if (endNormalizedAnchor) {
				endNormalizedAnchor.x = 1 - endNormalizedAnchor.x
			}
		} else if (scaleX >= 0 && scaleY < 0) {
			if (bend !== 0) {
				bend *= -1
				bend *= Math.max(mx, my)
			}

			if (startNormalizedAnchor) {
				startNormalizedAnchor.y = 1 - startNormalizedAnchor.y
			}

			if (endNormalizedAnchor) {
				endNormalizedAnchor.y = 1 - endNormalizedAnchor.y
			}
		} else if (scaleX >= 0 && scaleY >= 0) {
			if (bend !== 0) {
				bend *= Math.max(mx, my)
			}
		} else if (scaleX < 0 && scaleY < 0) {
			if (bend !== 0) {
				bend *= Math.max(mx, my)
			}

			if (startNormalizedAnchor) {
				startNormalizedAnchor.x = 1 - startNormalizedAnchor.x
				startNormalizedAnchor.y = 1 - startNormalizedAnchor.y
			}

			if (endNormalizedAnchor) {
				endNormalizedAnchor.x = 1 - endNormalizedAnchor.x
				endNormalizedAnchor.y = 1 - endNormalizedAnchor.y
			}
		}

		if (bindings.start && startNormalizedAnchor) {
			createOrUpdateArrowBinding(this.editor, shape, bindings.start.toId, {
				...bindings.start.props,
				normalizedAnchor: startNormalizedAnchor.toJson(),
			})
		}
		if (bindings.end && endNormalizedAnchor) {
			createOrUpdateArrowBinding(this.editor, shape, bindings.end.toId, {
				...bindings.end.props,
				normalizedAnchor: endNormalizedAnchor.toJson(),
			})
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

	override onDoubleClickHandle(
		shape: TLArrowShape,
		handle: TLHandle
	): TLShapePartial<TLArrowShape> | void {
		switch (handle.id) {
			case ArrowHandles.Start: {
				return {
					id: shape.id,
					type: shape.type,
					props: {
						...shape.props,
						arrowheadStart: shape.props.arrowheadStart === 'none' ? 'arrow' : 'none',
					},
				}
			}
			case ArrowHandles.End: {
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
			) && !this.editor.getIsReadonly()

		const info = getArrowInfo(this.editor, shape)
		if (!info?.isValid) return null

		const labelPosition = getArrowLabelPosition(this.editor, shape)
		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()
		const isEditing = this.editor.getEditingShapeId() === shape.id
		const showArrowLabel = isEditing || !isEmptyRichText(shape.props.richText)

		return (
			<>
				<SVGContainer style={{ minWidth: 50, minHeight: 50 }}>
					<ArrowSvg
						shape={shape}
						shouldDisplayHandles={shouldDisplayHandles && onlySelectedShape?.id === shape.id}
					/>
					{shape.props.kind === 'elbow' && debugFlags.debugElbowArrows.get() && (
						<ElbowArrowDebug arrow={shape} />
					)}
				</SVGContainer>
				{showArrowLabel && (
					<RichTextLabel
						shapeId={shape.id}
						type="arrow"
						font={shape.props.font}
						fontSize={getArrowLabelFontSize(shape)}
						lineHeight={TEXT_PROPS.lineHeight}
						align="middle"
						verticalAlign="middle"
						labelColor={getColorValue(theme, shape.props.labelColor, 'solid')}
						richText={shape.props.richText}
						textWidth={labelPosition.box.w - ARROW_LABEL_PADDING * 2 * shape.props.scale}
						isSelected={isSelected}
						padding={0}
						style={{
							transform: `translate(${labelPosition.box.center.x}px, ${labelPosition.box.center.y}px)`,
						}}
					/>
				)}
			</>
		)
	}

	indicator(shape: TLArrowShape) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isEditing = useIsEditing(shape.id)
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const clipPathId = useSharedSafeId(shape.id + '_clip')

		const info = getArrowInfo(this.editor, shape)
		if (!info) return null

		const { start, end } = getArrowTerminalsInArrowSpace(this.editor, shape, info?.bindings)
		const geometry = this.editor.getShapeGeometry<Group2d>(shape)
		const bounds = geometry.bounds
		const isEmpty = isEmptyRichText(shape.props.richText)

		const labelGeometry = isEditing || !isEmpty ? (geometry.children[1] as Rectangle2d) : null

		if (Vec.Equals(start, end)) return null

		const strokeWidth = STROKE_SIZES[shape.props.size] * shape.props.scale

		const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
		const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

		const includeClipPath =
			(as && info.start.arrowhead !== 'arrow') ||
			(ae && info.end.arrowhead !== 'arrow') ||
			!!labelGeometry

		const labelBounds = labelGeometry ? labelGeometry.getBounds() : new Box(0, 0, 0, 0)

		if (isEditing && labelGeometry) {
			return (
				<rect
					x={toDomPrecision(labelBounds.x)}
					y={toDomPrecision(labelBounds.y)}
					width={labelBounds.w}
					height={labelBounds.h}
					rx={3.5 * shape.props.scale}
					ry={3.5 * shape.props.scale}
				/>
			)
		}
		const clipStartArrowhead = !(
			info.start.arrowhead === 'none' || info.start.arrowhead === 'arrow'
		)
		const clipEndArrowhead = !(info.end.arrowhead === 'none' || info.end.arrowhead === 'arrow')

		return (
			<g>
				{includeClipPath && (
					<defs>
						<ArrowClipPath
							radius={3.5 * shape.props.scale}
							hasText={!isEmpty}
							bounds={bounds}
							labelBounds={labelBounds}
							as={clipStartArrowhead && as ? as : ''}
							ae={clipEndArrowhead && ae ? ae : ''}
						/>
					</defs>
				)}
				<g
					style={{
						clipPath: includeClipPath ? `url(#${clipPathId})` : undefined,
						WebkitClipPath: includeClipPath ? `url(#${clipPathId})` : undefined,
					}}
				>
					{/* This rect needs to be here if we're creating a mask due to an svg quirk on Chrome */}
					{includeClipPath && (
						<rect
							x={bounds.minX - 100}
							y={bounds.minY - 100}
							width={bounds.width + 200}
							height={bounds.height + 200}
							opacity={0}
						/>
					)}

					{getArrowBodyPath(
						shape,
						info,
						shape.props.dash === 'draw'
							? {
									style: 'draw',
									randomSeed: shape.id,
									strokeWidth: 1,
									passes: 1,
									offset: 0,
									roundness: strokeWidth * 2,
									props: { strokeWidth: undefined },
								}
							: { style: 'solid', strokeWidth: 1, props: { strokeWidth: undefined } }
					)}
				</g>
				{as && <path d={as} />}
				{ae && <path d={ae} />}
				{labelGeometry && (
					<rect
						x={toDomPrecision(labelBounds.x)}
						y={toDomPrecision(labelBounds.y)}
						width={labelBounds.w}
						height={labelBounds.h}
						rx={3.5}
						ry={3.5}
					/>
				)}
			</g>
		)
	}

	override onEditStart(shape: TLArrowShape) {
		if (isEmptyRichText(shape.props.richText)) {
			// editing text for the first time, so set the position to the default:
			const labelPosition = getArrowLabelDefaultPosition(this.editor, shape)
			this.editor.updateShape<TLArrowShape>({
				id: shape.id,
				type: shape.type,
				props: { labelPosition },
			})
		}
	}

	override toSvg(shape: TLArrowShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFillDefForExport(shape.props.fill))
		const theme = getDefaultColorTheme(ctx)
		const scaleFactor = 1 / shape.props.scale

		return (
			<g transform={`scale(${scaleFactor})`}>
				<ArrowSvg shape={shape} shouldDisplayHandles={false} />
				<RichTextSVG
					fontSize={getArrowLabelFontSize(shape)}
					font={shape.props.font}
					align="middle"
					verticalAlign="middle"
					labelColor={getColorValue(theme, shape.props.labelColor, 'solid')}
					richText={shape.props.richText}
					bounds={getArrowLabelPosition(this.editor, shape)
						.box.clone()
						.expandBy(-ARROW_LABEL_PADDING * shape.props.scale)}
					padding={0}
					showTextOutline={true}
				/>
			</g>
		)
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [
			getFillDefForCanvas(),
			{
				key: `arrow:dot`,
				component: ArrowheadDotDef,
			},
			{
				key: `arrow:cross`,
				component: ArrowheadCrossDef,
			},
		]
	}
	override getInterpolatedProps(
		startShape: TLArrowShape,
		endShape: TLArrowShape,
		progress: number
	): TLArrowShapeProps {
		return {
			...(progress > 0.5 ? endShape.props : startShape.props),
			scale: lerp(startShape.props.scale, endShape.props.scale, progress),
			start: {
				x: lerp(startShape.props.start.x, endShape.props.start.x, progress),
				y: lerp(startShape.props.start.y, endShape.props.start.y, progress),
			},
			end: {
				x: lerp(startShape.props.end.x, endShape.props.end.x, progress),
				y: lerp(startShape.props.end.y, endShape.props.end.y, progress),
			},
			bend: lerp(startShape.props.bend, endShape.props.bend, progress),
			labelPosition: lerp(startShape.props.labelPosition, endShape.props.labelPosition, progress),
		}
	}
}

export function getArrowLength(editor: Editor, shape: TLArrowShape): number {
	const info = getArrowInfo(editor, shape)!

	return info.type === 'straight'
		? Vec.Dist(info.start.handle, info.end.handle)
		: info.type === 'arc'
			? Math.abs(info.handleArc.length)
			: info.route.distance
}

const ArrowSvg = track(function ArrowSvg({
	shape,
	shouldDisplayHandles,
}: {
	shape: TLArrowShape
	shouldDisplayHandles: boolean
}) {
	const editor = useEditor()
	const theme = useDefaultColorTheme()
	const info = getArrowInfo(editor, shape)
	const isForceSolid = useValue(
		'force solid',
		() => {
			return editor.getZoomLevel() < 0.2
		},
		[editor]
	)
	const clipPathId = useSharedSafeId(shape.id + '_clip')
	const arrowheadDotId = useSharedSafeId('arrowhead-dot')
	const arrowheadCrossId = useSharedSafeId('arrowhead-cross')
	const isEditing = useIsEditing(shape.id)
	const geometry = editor.getShapeGeometry(shape)
	if (!geometry) return null
	const bounds = Box.ZeroFix(geometry.bounds)
	const bindings = getArrowBindings(editor, shape)
	const isEmpty = isEmptyRichText(shape.props.richText)

	if (!info?.isValid) return null

	const strokeWidth = STROKE_SIZES[shape.props.size] * shape.props.scale

	const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
	const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

	let handlePath: null | React.JSX.Element = null

	if (shouldDisplayHandles && (bindings.start || bindings.end)) {
		handlePath = getArrowHandlePath(info, {
			style: 'dashed',
			start: 'skip',
			end: 'skip',
			lengthRatio: 2.5,
			strokeWidth: 2 / editor.getZoomLevel(),
			props: {
				className: 'tl-arrow-hint',
				markerStart: bindings.start
					? bindings.start.props.isExact
						? ''
						: bindings.start.props.isPrecise
							? `url(#${arrowheadCrossId})`
							: `url(#${arrowheadDotId})`
					: '',
				markerEnd: bindings.end
					? bindings.end.props.isExact
						? ''
						: bindings.end.props.isPrecise
							? `url(#${arrowheadCrossId})`
							: `url(#${arrowheadDotId})`
					: '',
				opacity: 0.16,
			},
		})
	}

	const labelPosition = getArrowLabelPosition(editor, shape)

	const clipStartArrowhead = !(info.start.arrowhead === 'none' || info.start.arrowhead === 'arrow')
	const clipEndArrowhead = !(info.end.arrowhead === 'none' || info.end.arrowhead === 'arrow')

	return (
		<>
			{/* Yep */}
			<defs>
				<clipPath id={clipPathId}>
					<ArrowClipPath
						radius={3.5 * shape.props.scale}
						hasText={isEditing || !isEmpty}
						bounds={bounds}
						labelBounds={labelPosition.box}
						as={clipStartArrowhead && as ? as : ''}
						ae={clipEndArrowhead && ae ? ae : ''}
					/>
				</clipPath>
			</defs>
			<g
				fill="none"
				stroke={getColorValue(theme, shape.props.color, 'solid')}
				strokeWidth={strokeWidth}
				strokeLinejoin="round"
				strokeLinecap="round"
				pointerEvents="none"
			>
				{handlePath}
				<g
					style={{
						clipPath: `url(#${clipPathId})`,
						WebkitClipPath: `url(#${clipPathId})`,
					}}
				>
					<rect
						x={toDomPrecision(bounds.minX - 100)}
						y={toDomPrecision(bounds.minY - 100)}
						width={toDomPrecision(bounds.width + 200)}
						height={toDomPrecision(bounds.height + 200)}
						opacity={0}
					/>
					{getArrowBodyPath(shape, info, {
						style: shape.props.dash,
						strokeWidth,
						forceSolid: isForceSolid,
						randomSeed: shape.id,
					})}
				</g>
				{as && clipStartArrowhead && shape.props.fill !== 'none' && (
					<ShapeFill
						theme={theme}
						d={as}
						color={shape.props.color}
						fill={shape.props.fill}
						scale={shape.props.scale}
					/>
				)}
				{ae && clipEndArrowhead && shape.props.fill !== 'none' && (
					<ShapeFill
						theme={theme}
						d={ae}
						color={shape.props.color}
						fill={shape.props.fill}
						scale={shape.props.scale}
					/>
				)}
				{as && <path d={as} />}
				{ae && <path d={ae} />}
			</g>
		</>
	)
})

function ArrowClipPath({
	radius,
	hasText,
	bounds,
	labelBounds,
	as,
	ae,
}: {
	radius: number
	hasText: boolean
	bounds: Box
	labelBounds: Box
	as: string
	ae: string
}) {
	const path = useMemo(() => {
		// The direction in which we create the different path parts is important, as it determines what gets clipped.
		// See the description on the directions in the non-zero fill rule example:
		// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule#nonzero
		const path = new PathBuilder()

		// We create this one in the clockwise direction
		path
			.moveTo(bounds.left - 100, bounds.top - 100)
			.lineTo(bounds.right + 100, bounds.top - 100)
			.lineTo(bounds.right + 100, bounds.bottom + 100)
			.lineTo(bounds.left - 100, bounds.bottom + 100)
			.close()

		if (hasText) {
			// We create this one in the counter-clockwise direction, which cuts out the label box
			path
				.moveTo(labelBounds.left, labelBounds.top + radius)
				.lineTo(labelBounds.left, labelBounds.bottom - radius)
				.circularArcTo(radius, false, false, labelBounds.left + radius, labelBounds.bottom)
				.lineTo(labelBounds.right - radius, labelBounds.bottom)
				.circularArcTo(radius, false, false, labelBounds.right, labelBounds.bottom - radius)
				.lineTo(labelBounds.right, labelBounds.top + radius)
				.circularArcTo(radius, false, false, labelBounds.right - radius, labelBounds.top)
				.lineTo(labelBounds.left + radius, labelBounds.top)
				.circularArcTo(radius, false, false, labelBounds.left, labelBounds.top + radius)
				.close()
		}

		return path.toD()
	}, [
		radius,
		hasText,
		bounds.bottom,
		bounds.left,
		bounds.right,
		bounds.top,
		labelBounds.bottom,
		labelBounds.left,
		labelBounds.right,
		labelBounds.top,
	])

	// We also append the arrowhead paths to the clip path, so that we also clip the arrowheads
	return <path d={`${path}${as}${ae}`} />
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
				binding: TLArrowBinding
			} | null
		>
	}
>()

function ArrowheadDotDef() {
	const id = useSharedSafeId('arrowhead-dot')
	return (
		<marker id={id} className="tl-arrow-hint" refX="3.0" refY="3.0" orient="0">
			<circle cx="3" cy="3" r="2" strokeDasharray="100%" />
		</marker>
	)
}

function ArrowheadCrossDef() {
	const id = useSharedSafeId('arrowhead-cross')
	return (
		<marker id={id} className="tl-arrow-hint" refX="3.0" refY="3.0" orient="auto">
			<line x1="1.5" y1="1.5" x2="4.5" y2="4.5" strokeDasharray="100%" />
			<line x1="1.5" y1="4.5" x2="4.5" y2="1.5" strokeDasharray="100%" />
		</marker>
	)
}

/**
 * Take 2 angles and return true if they are approximately parallel. Angle that point in the same
 * (or opposite) directions are considered parallel. This also handles wrap around - e.g. 0, π, and
 * 2π are all considered parallel.
 */
function anglesAreApproximatelyParallel(a: number, b: number, tolerance = 0.0001) {
	const diff = Math.abs(a - b)

	const isParallel = diff < tolerance
	const isFlippedParallel = Math.abs(diff - Math.PI) < tolerance
	const is360Parallel = Math.abs(diff - PI2) < tolerance

	return { isParallel: isParallel || is360Parallel, isFlippedParallel }
}
