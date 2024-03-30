import {
	Arc2d,
	Box,
	Edge2d,
	Editor,
	Geometry2d,
	Group2d,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	SvgExportContext,
	TLArrowShape,
	TLArrowShapeProps,
	TLHandle,
	TLOnEditEndHandler,
	TLOnHandleDragHandler,
	TLOnResizeHandler,
	TLOnTranslateHandler,
	TLOnTranslateStartHandler,
	TLShapePartial,
	TLShapeUtilCanvasSvgDef,
	TLShapeUtilFlag,
	Vec,
	arrowShapeMigrations,
	arrowShapeProps,
	getArrowTerminalsInArrowSpace,
	mapObjectMapValues,
	objectMapEntries,
	structuredClone,
	toDomPrecision,
	track,
	useEditor,
	useIsEditing,
} from '@tldraw/editor'
import React from 'react'
import { ShapeFill, useDefaultColorTheme } from '../shared/ShapeFill'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { ARROW_LABEL_FONT_SIZES, STROKE_SIZES } from '../shared/default-shape-constants'
import {
	getFillDefForCanvas,
	getFillDefForExport,
	getFontDefForExport,
} from '../shared/defaultStyleDefs'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { getArrowLabelPosition } from './arrowLabel'
import { getArrowheadPathForType } from './arrowheads'
import {
	getCurvedArrowHandlePath,
	getSolidCurvedArrowPath,
	getSolidStraightArrowPath,
	getStraightArrowHandlePath,
} from './arrowpaths'
import { ArrowTextLabel } from './components/ArrowTextLabel'

let globalRenderIndex = 0

enum ARROW_HANDLES {
	START = 'start',
	MIDDLE = 'middle',
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

		const debugGeom: Geometry2d[] = []

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

		let labelGeom
		if (shape.props.text.trim()) {
			const labelPosition = getArrowLabelPosition(this.editor, shape)
			debugGeom.push(...labelPosition.debugGeom)
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
		const info = this.editor.getArrowInfo(shape)!

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

	override onHandleDrag: TLOnHandleDragHandler<TLArrowShape> = (shape, { handle, isPrecise }) => {
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

		// Start or end, pointing the arrow...

		const next = structuredClone(shape) as TLArrowShape

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

		const { start, end } = structuredClone<TLArrowShape['props']>(shape.props)
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

	component(shape: TLArrowShape, isCulled: boolean) {
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
		if (!info?.isValid) return null

		const labelPosition = getArrowLabelPosition(this.editor, shape)
		const isEditing = this.editor.getEditingShapeId() === shape.id
		const showArrowLabel = isEditing || shape.props.text

		return (
			<>
				<SVGContainer
					id={shape.id}
					style={{ minWidth: 50, minHeight: 50, display: isCulled ? 'none' : undefined }}
				>
					<ArrowSvg
						shape={shape}
						shouldDisplayHandles={shouldDisplayHandles && onlySelectedShape === shape}
					/>
				</SVGContainer>
				{showArrowLabel && (
					<ArrowTextLabel
						id={shape.id}
						text={shape.props.text}
						font={shape.props.font}
						size={shape.props.size}
						position={labelPosition.box.center}
						width={labelPosition.box.w}
						labelColor={shape.props.labelColor}
						style={{ display: isCulled ? 'none' : undefined }}
					/>
				)}
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
		ctx.addExportDef(getFillDefForExport(shape.props.fill))
		if (shape.props.text) ctx.addExportDef(getFontDefForExport(shape.props.font))

		return (
			<>
				<ArrowSvg shape={shape} shouldDisplayHandles={false} />
				<SvgTextLabel
					fontSize={ARROW_LABEL_FONT_SIZES[shape.props.size]}
					font={shape.props.font}
					align="middle"
					verticalAlign="middle"
					text={shape.props.text}
					labelColor={shape.props.labelColor}
					bounds={getArrowLabelPosition(this.editor, shape).box}
					padding={4}
				/>
			</>
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
}

function getLength(editor: Editor, shape: TLArrowShape): number {
	const info = editor.getArrowInfo(shape)!

	return info.isStraight
		? Vec.Dist(info.start.handle, info.end.handle)
		: Math.abs(info.handleArc.length)
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
	const info = editor.getArrowInfo(shape)
	const bounds = Box.ZeroFix(editor.getShapeGeometry(shape).bounds)

	const changeIndex = React.useMemo<number>(() => {
		return editor.environment.isSafari ? (globalRenderIndex += 1) : 0
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shape])

	if (!info?.isValid) return null

	const strokeWidth = STROKE_SIZES[shape.props.size]

	const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
	const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

	const path = info.isStraight ? getSolidStraightArrowPath(info) : getSolidCurvedArrowPath(info)

	let handlePath: null | React.JSX.Element = null

	if (shouldDisplayHandles) {
		const sw = 2
		const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
			getLength(editor, shape),
			sw,
			{
				end: 'skip',
				start: 'skip',
				lengthRatio: 2.5,
			}
		)

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

	const labelPosition = getArrowLabelPosition(editor, shape)

	const maskStartArrowhead = !(info.start.arrowhead === 'none' || info.start.arrowhead === 'arrow')
	const maskEndArrowhead = !(info.end.arrowhead === 'none' || info.end.arrowhead === 'arrow')

	// NOTE: I know right setting `changeIndex` hacky-as right! But we need this because otherwise safari loses
	// the mask, see <https://linear.app/tldraw/issue/TLD-1500/changing-arrow-color-makes-line-pass-through-text>
	const maskId = (shape.id + '_clip_' + changeIndex).replace(':', '_')

	return (
		<>
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
					{shape.props.text.trim() && (
						<rect
							x={labelPosition.box.x}
							y={labelPosition.box.y}
							width={labelPosition.box.w}
							height={labelPosition.box.h}
							fill="black"
							rx={4}
							ry={4}
						/>
					)}
					{as && maskStartArrowhead && (
						<path d={as} fill={info.start.arrowhead === 'arrow' ? 'none' : 'black'} stroke="none" />
					)}
					{ae && maskEndArrowhead && (
						<path d={ae} fill={info.end.arrowhead === 'arrow' ? 'none' : 'black'} stroke="none" />
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
					<path d={path} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
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
		</>
	)
})

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

function ArrowheadDotDef() {
	return (
		<marker id="arrowhead-dot" className="tl-arrow-hint" refX="3.0" refY="3.0" orient="0">
			<circle cx="3" cy="3" r="2" strokeDasharray="100%" />
		</marker>
	)
}

function ArrowheadCrossDef() {
	return (
		<marker id="arrowhead-cross" className="tl-arrow-hint" refX="3.0" refY="3.0" orient="auto">
			<line x1="1.5" y1="1.5" x2="4.5" y2="4.5" strokeDasharray="100%" />
			<line x1="1.5" y1="4.5" x2="4.5" y2="1.5" strokeDasharray="100%" />
		</marker>
	)
}
