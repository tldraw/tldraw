/* eslint-disable react-hooks/rules-of-hooks */
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
import {
	ARROW_LABEL_FONT_SIZES,
	ARROW_LABEL_PADDING,
	STROKE_SIZES,
	getFontFamily,
} from '../shared/default-shape-constants'
import { DEFAULT_FILL_COLOR_NAMES } from '../shared/defaultFills'
import { getThemeFontFaces } from '../shared/defaultFonts'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { getDisplayValues } from '../shared/getDisplayValues'
import { PathBuilder } from '../shared/PathBuilder'
import { PatternFill } from '../shared/PatternFill'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import { useEfficientZoomThreshold } from '../shared/useEfficientZoomThreshold'
import { ArrowShapeOptions, type ArrowShapeUtilDisplayValues } from './arrow-types'
import { getArrowheadPathForType } from './arrowheads'
import { getArrowLabelDefaultPosition, getArrowLabelPosition } from './arrowLabel'
import { getArrowBodyPath, getArrowBodyPathBuilder } from './ArrowPath'
import { updateArrowTargetState } from './arrowTargetState'
import { ElbowArrowAxes } from './elbow/definitions'
import { ElbowArrowDebug } from './elbow/ElbowArrowDebug'
import { getElbowArrowSnapLines, perpDistanceToLineAngle } from './elbow/elbowArrowSnapLines'
import { getArrowInfo } from './getArrowInfo'
import {
	TLArrowBindings,
	createOrUpdateArrowBinding,
	getArrowBindings,
	getArrowTerminalsInArrowSpace,
	removeArrowBinding,
} from './shared'

const ArrowHandles = {
	Start: 'start',
	Middle: 'middle',
	End: 'end',
} as const
type ArrowHandles = (typeof ArrowHandles)[keyof typeof ArrowHandles]

function addRoundedRectPath(path: Path2D, bounds: Box, radius: number, counterClockwise = false) {
	const r = Math.max(0, Math.min(radius, bounds.w / 2, bounds.h / 2))

	if (r === 0) {
		path.rect(bounds.x, bounds.y, bounds.w, bounds.h)
		return
	}

	if (counterClockwise) {
		path.moveTo(bounds.x, bounds.y + r)
		path.lineTo(bounds.x, bounds.maxY - r)
		path.arcTo(bounds.x, bounds.maxY, bounds.x + r, bounds.maxY, r)
		path.lineTo(bounds.maxX - r, bounds.maxY)
		path.arcTo(bounds.maxX, bounds.maxY, bounds.maxX, bounds.maxY - r, r)
		path.lineTo(bounds.maxX, bounds.y + r)
		path.arcTo(bounds.maxX, bounds.y, bounds.maxX - r, bounds.y, r)
		path.lineTo(bounds.x + r, bounds.y)
		path.arcTo(bounds.x, bounds.y, bounds.x, bounds.y + r, r)
		path.closePath()
		return
	}

	path.moveTo(bounds.x + r, bounds.y)
	path.lineTo(bounds.maxX - r, bounds.y)
	path.arcTo(bounds.maxX, bounds.y, bounds.maxX, bounds.y + r, r)
	path.lineTo(bounds.maxX, bounds.maxY - r)
	path.arcTo(bounds.maxX, bounds.maxY, bounds.maxX - r, bounds.maxY, r)
	path.lineTo(bounds.x + r, bounds.maxY)
	path.arcTo(bounds.x, bounds.maxY, bounds.x, bounds.maxY - r, r)
	path.lineTo(bounds.x, bounds.y + r)
	path.arcTo(bounds.x, bounds.y, bounds.x + r, bounds.y, r)
	path.closePath()
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
			s: 6,
			m: 10.5,
			l: 15,
			xl: 30,
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
		shouldBeExact(editor: Editor) {
			return editor.inputs.getAltKey()
		},
		shouldIgnoreTargets(editor: Editor) {
			return editor.inputs.getCtrlKey()
		},
		showTextOutline: true,
		getDefaultDisplayValues(_editor, shape, theme, colorMode): ArrowShapeUtilDisplayValues {
			const { color, fill, labelColor, size, font } = shape.props
			const colors = theme.colors[colorMode]
			return {
				strokeColor: getColorValue(colors, color, 'solid'),
				strokeWidth: theme.strokeWidth * STROKE_SIZES[size],
				fillColor:
					fill === 'none'
						? 'transparent'
						: fill === 'semi'
							? colors.solid
							: getColorValue(colors, color, DEFAULT_FILL_COLOR_NAMES[fill]),
				patternFillFallbackColor: getColorValue(colors, color, 'semi'),
				labelColor: getColorValue(colors, labelColor, 'solid'),
				labelFontFamily: getFontFamily(theme, font),
				labelFontSize: theme.fontSize * ARROW_LABEL_FONT_SIZES[size],
				labelLineHeight: theme.lineHeight,
				labelPadding: ARROW_LABEL_PADDING,
				labelBorderRadius: 3.5,
			}
		},
		getCustomDisplayValues(): Partial<ArrowShapeUtilDisplayValues> {
			return {}
		},
	}

	override canEdit(shape: TLArrowShape) {
		return true
	}
	override canBind({ toShape }: TLShapeUtilCanBindOpts<TLArrowShape>): boolean {
		// bindings can go from arrows to shapes, but not from shapes to arrows
		return toShape.type !== 'arrow'
	}
	override canSnap(shape: TLArrowShape) {
		return false
	}
	override hideResizeHandles(shape: TLArrowShape) {
		return true
	}
	override hideRotateHandle(shape: TLArrowShape) {
		return true
	}
	override hideSelectionBoundsBg(shape: TLArrowShape) {
		return true
	}
	override hideSelectionBoundsFg(shape: TLArrowShape) {
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

		const themeFaces = getThemeFontFaces(this.editor.getCurrentTheme(), shape.props.font)
		if (themeFaces) return themeFaces
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
		if (info.isValid && (isEditing || !isEmptyRichText(shape.props.richText))) {
			const labelPosition = getArrowLabelPosition(this.editor, shape, isEditing)
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
			const segmentLength = Vec.Dist(segmentStart, segmentEnd) * this.editor.getEfficientZoomLevel()

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
		const maxSnapDistance =
			this.options.elbowMidpointSnapDistance / this.editor.getEfficientZoomLevel()

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
		handleId: typeof ArrowHandles.Start | typeof ArrowHandles.End
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
		const { editor } = this
		const dv = getDisplayValues(this, shape)

		const isSelected = useValue(
			'is selected',
			() => editor.getOnlySelectedShape()?.id === shape.id,
			[editor, shape.id]
		)

		const isEditing = useValue('is editing', () => editor.getEditingShapeId() === shape.id, [
			editor,
			shape.id,
		])

		const info = getArrowInfo(editor, shape)
		if (!info?.isValid) return null

		const labelPosition = getArrowLabelPosition(editor, shape, isEditing)
		const showArrowLabel = isEditing || !isEmptyRichText(shape.props.richText)

		return (
			<>
				<SVGContainer style={{ minWidth: 50, minHeight: 50 }}>
					<ArrowSvg
						shape={shape}
						strokeColor={dv.strokeColor}
						strokeWidth={dv.strokeWidth}
						fillColor={dv.fillColor}
						patternFillFallbackColor={dv.patternFillFallbackColor}
						labelBorderRadius={dv.labelBorderRadius}
					/>
					{shape.props.kind === 'elbow' && debugFlags.debugElbowArrows.get() && (
						<ElbowArrowDebug arrow={shape} />
					)}
				</SVGContainer>
				{showArrowLabel && (
					<RichTextLabel
						shapeId={shape.id}
						type="arrow"
						fontFamily={dv.labelFontFamily}
						fontSize={dv.labelFontSize}
						lineHeight={dv.labelLineHeight}
						textAlign="center"
						verticalAlign="middle"
						labelColor={dv.labelColor}
						richText={shape.props.richText}
						textWidth={
							(labelPosition.box.w - dv.labelPadding * 2 * shape.props.scale) / shape.props.scale
						}
						isSelected={isSelected}
						padding={0}
						showTextOutline={this.options.showTextOutline}
						style={{
							transform: `translate(${labelPosition.box.center.x}px, ${labelPosition.box.center.y}px)${shape.props.scale !== 1 ? ` scale(${shape.props.scale})` : ''}`,
						}}
					/>
				)}
			</>
		)
	}

	override getIndicatorPath(shape: TLArrowShape) {
		const info = getArrowInfo(this.editor, shape)
		if (!info) return undefined

		const dv = getDisplayValues(this, shape)

		const isEditing = this.editor.getEditingShapeId() === shape.id
		const { start, end } = getArrowTerminalsInArrowSpace(this.editor, shape, info?.bindings)
		const geometry = this.editor.getShapeGeometry<Group2d>(shape)
		const isEmpty = isEmptyRichText(shape.props.richText)

		const labelGeometry = isEditing || !isEmpty ? (geometry.children[1] as Rectangle2d) : null

		if (Vec.Equals(start, end)) return undefined

		const strokeWidth = dv.strokeWidth * shape.props.scale

		// If editing and has label, just return the label rect
		if (isEditing && labelGeometry) {
			const labelBounds = labelGeometry.getBounds()
			const path = new Path2D()
			addRoundedRectPath(path, labelBounds, dv.labelBorderRadius * shape.props.scale)
			return path
		}

		// Get arrow body path
		const isForceSolid = this.editor.getEfficientZoomLevel() < 0.25 / shape.props.scale
		const bodyPathBuilder = getArrowBodyPathBuilder(info)
		const bodyPath2D = bodyPathBuilder.toPath2D(
			shape.props.dash === 'draw' && !isForceSolid
				? {
						style: 'draw',
						randomSeed: shape.id,
						strokeWidth: 1,
						passes: 1,
						offset: 0,
						roundness: strokeWidth * 2,
					}
				: { style: 'solid', strokeWidth: 1 }
		)

		// Get arrowhead paths
		const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
		const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

		// Check if we need clipping (label or complex arrowheads)
		const clipStartArrowhead = !!(as && info.start.arrowhead !== 'arrow')
		const clipEndArrowhead = !!(ae && info.end.arrowhead !== 'arrow')
		const needsClipping = labelGeometry || clipStartArrowhead || clipEndArrowhead

		if (needsClipping) {
			// Create clip path using evenodd rule
			const bounds = geometry.bounds
			const clipPath = new Path2D()

			// Outer rectangle (clockwise) - defines the area to keep
			clipPath.rect(bounds.minX - 100, bounds.minY - 100, bounds.width + 200, bounds.height + 200)

			// Label cutout (counter-clockwise)
			if (labelGeometry) {
				const labelBounds = labelGeometry.getBounds()
				addRoundedRectPath(clipPath, labelBounds, dv.labelBorderRadius * shape.props.scale, true)
			}

			// Add arrowhead paths to clip path if needed
			if (clipStartArrowhead && as) {
				clipPath.addPath(new Path2D(as))
			}
			if (clipEndArrowhead && ae) {
				clipPath.addPath(new Path2D(ae))
			}

			// Additional paths (arrowheads, label rect) to draw after clipped body
			const additionalPaths: Path2D[] = []
			if (as) additionalPaths.push(new Path2D(as))
			if (ae) additionalPaths.push(new Path2D(ae))
			if (labelGeometry) {
				const labelBounds = labelGeometry.getBounds()
				const labelPath = new Path2D()
				addRoundedRectPath(labelPath, labelBounds, dv.labelBorderRadius * shape.props.scale)
				additionalPaths.push(labelPath)
			}

			return {
				path: bodyPath2D,
				clipPath,
				additionalPaths,
			}
		}

		// No clipping needed - combine all paths into one
		const combinedPath = new Path2D()
		combinedPath.addPath(bodyPath2D)

		if (as) {
			combinedPath.addPath(new Path2D(as))
		}
		if (ae) {
			combinedPath.addPath(new Path2D(ae))
		}

		return combinedPath
	}

	override onEditStart(shape: TLArrowShape) {
		if (isEmptyRichText(shape.props.richText)) {
			// editing text for the first time, so set the position to the default:
			const labelPosition = getArrowLabelDefaultPosition(this.editor, shape)
			this.editor.updateShape({
				id: shape.id,
				type: shape.type,
				props: { labelPosition },
			})
		}
	}

	override toSvg(shape: TLArrowShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFillDefForExport(shape.props.fill))
		const dv = getDisplayValues(this, shape, ctx.colorMode)
		const scaleFactor = 1 / shape.props.scale

		const showArrowLabel = !isEmptyRichText(shape.props.richText)

		return (
			<g transform={`scale(${scaleFactor})`}>
				<ArrowSvg
					shape={shape}
					strokeColor={dv.strokeColor}
					strokeWidth={dv.strokeWidth}
					fillColor={dv.fillColor}
					patternFillFallbackColor={dv.patternFillFallbackColor}
					labelBorderRadius={dv.labelBorderRadius}
				/>
				{showArrowLabel && (
					<RichTextSVG
						fontSize={dv.labelFontSize * shape.props.scale}
						fontFamily={dv.labelFontFamily}
						lineHeight={dv.labelLineHeight}
						textAlign="center"
						verticalAlign="middle"
						labelColor={dv.labelColor}
						richText={shape.props.richText}
						bounds={getArrowLabelPosition(this.editor, shape, false)
							.box.clone()
							.expandBy(-dv.labelPadding * shape.props.scale)}
						padding={0}
						showTextOutline={this.options.showTextOutline}
					/>
				)}
			</g>
		)
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [getFillDefForCanvas()]
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
	strokeColor,
	strokeWidth: baseStrokeWidth,
	fillColor,
	patternFillFallbackColor,
	labelBorderRadius = 3.5,
}: {
	shape: TLArrowShape
	strokeColor: string
	strokeWidth: number
	fillColor: string
	patternFillFallbackColor: string
	labelBorderRadius?: number
}) {
	const editor = useEditor()
	const info = getArrowInfo(editor, shape)
	const isForceSolid = useEfficientZoomThreshold(0.25 / shape.props.scale)
	const clipPathId = useSharedSafeId(shape.id + '_clip')
	const isEditing = useIsEditing(shape.id)
	const geometry = editor.getShapeGeometry(shape)
	if (!geometry) return null
	const bounds = Box.ZeroFix(geometry.bounds)
	const isEmpty = isEmptyRichText(shape.props.richText)

	if (!info?.isValid) return null

	const strokeWidth = baseStrokeWidth * shape.props.scale

	const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
	const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

	const labelPosition = getArrowLabelPosition(editor, shape, isEditing)

	const clipStartArrowhead = !(info.start.arrowhead === 'none' || info.start.arrowhead === 'arrow')
	const clipEndArrowhead = !(info.end.arrowhead === 'none' || info.end.arrowhead === 'arrow')

	return (
		<>
			{/* Yep */}
			<defs>
				<clipPath id={clipPathId}>
					<ArrowClipPath
						radius={labelBorderRadius * shape.props.scale}
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
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				strokeLinejoin="round"
				strokeLinecap="round"
				pointerEvents="none"
			>
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
				{as &&
					clipStartArrowhead &&
					shape.props.fill !== 'none' &&
					(shape.props.fill === 'pattern' ? (
						<PatternFill
							d={as}
							fillColor={fillColor}
							patternFillFallbackColor={patternFillFallbackColor}
							scale={shape.props.scale}
						/>
					) : (
						<path fill={fillColor} d={as} />
					))}
				{ae &&
					clipEndArrowhead &&
					shape.props.fill !== 'none' &&
					(shape.props.fill === 'pattern' ? (
						<PatternFill
							d={ae}
							fillColor={fillColor}
							patternFillFallbackColor={patternFillFallbackColor}
							scale={shape.props.scale}
						/>
					) : (
						<path fill={fillColor} d={ae} />
					))}
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
