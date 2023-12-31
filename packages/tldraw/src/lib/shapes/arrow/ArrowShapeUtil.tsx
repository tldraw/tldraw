import {
	Arc2d,
	Box2d,
	DefaultFontFamilies,
	Edge2d,
	Group2d,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	SvgExportContext,
	TLArrowBinding,
	TLArrowShape,
	TLArrowShapeArrowheadStyle,
	TLDefaultColorStyle,
	TLDefaultColorTheme,
	TLDefaultFillStyle,
	TLHandle,
	TLOnAfterAddedToStoreHandler,
	TLOnAfterChangeHandler,
	TLOnEditEndHandler,
	TLOnHandleChangeHandler,
	TLOnResizeHandler,
	TLOnTranslateStartHandler,
	TLParentId,
	TLShape,
	TLShapePartial,
	TLShapeUtilCanvasSvgDef,
	TLShapeUtilFlag,
	Vec2d,
	arrowShapeMigrations,
	arrowShapeProps,
	compact,
	createBindingId,
	deepCopy,
	getArrowBindings,
	getArrowTerminalsInArrowSpace,
	getArrowheadPathForType,
	getCurvedArrowHandlePath,
	getDefaultColorTheme,
	getIndexAbove,
	getIndexBetween,
	getSolidCurvedArrowPath,
	getSolidStraightArrowPath,
	getStraightArrowHandlePath,
	toDomPrecision,
	useIsEditing,
} from '@tldraw/editor'
import React from 'react'
import { ShapeFill, getShapeFillSvg, useDefaultColorTheme } from '../shared/ShapeFill'
import { createTextSvgElementFromSpans } from '../shared/createTextSvgElementFromSpans'
import {
	ARROW_LABEL_FONT_SIZES,
	FONT_FAMILIES,
	STROKE_SIZES,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import {
	getFillDefForCanvas,
	getFillDefForExport,
	getFontDefForExport,
} from '../shared/defaultStyleDefs'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { ArrowTextLabel } from './components/ArrowTextLabel'

let globalRenderIndex = 0

export const ARROW_END_OFFSET = 0.1

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
			start: { x: 0, y: 0 },
			end: { x: 2, y: 0 },
			arrowheadStart: 'none',
			arrowheadEnd: 'arrow',
			text: '',
			font: 'draw',
		}
	}

	getGeometry(shape: TLArrowShape) {
		const info = this.editor.getArrowInfo(shape)!

		const bodyGeom = info.isStraight
			? new Edge2d({
					start: Vec2d.From(info.start.point),
					end: Vec2d.From(info.end.point),
			  })
			: new Arc2d({
					center: Vec2d.Cast(info.handleArc.center),
					radius: info.handleArc.radius,
					start: Vec2d.Cast(info.start.point),
					end: Vec2d.Cast(info.end.point),
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

			labelGeom = new Rectangle2d({
				x: info.middle.x - width / 2 - 4.25,
				y: info.middle.y - height / 2 - 4.25,
				width: width + 8.5,
				height: height + 8.5,
				isFilled: true,
				isLabel: true,
			})
		}

		return new Group2d({
			children: labelGeom ? [bodyGeom, labelGeom] : [bodyGeom],
			isSnappable: false,
		})
	}

	override getHandles(shape: TLArrowShape): TLHandle[] {
		const info = this.editor.getArrowInfo(shape)!
		return [
			{
				id: 'start',
				type: 'vertex',
				index: 'a0',
				x: info.start.handle.x,
				y: info.start.handle.y,
				canBind: true,
			},
			{
				id: 'middle',
				type: 'virtual',
				index: 'a2',
				x: info.middle.x,
				y: info.middle.y,
				canBind: false,
			},
			{
				id: 'end',
				type: 'vertex',
				index: 'a3',
				x: info.end.handle.x,
				y: info.end.handle.y,
				canBind: true,
			},
		]
	}

	override onAfterAddedToStore: TLOnAfterAddedToStoreHandler<TLArrowShape> = (shape) => {
		this.arrowDidUpdate(shape)
	}
	override onAfterChange: TLOnAfterChangeHandler<TLArrowShape> = (_prev, next) => {
		this.arrowDidUpdate(next)
	}

	override onHandleChange: TLOnHandleChangeHandler<TLArrowShape> = (
		shape,
		{ handle, isPrecise }
	) => {
		const handleId = handle.id as 'start' | 'middle' | 'end'

		if (handleId === 'middle') {
			// Bending the arrow...
			const { start, end } = getArrowTerminalsInArrowSpace(this.editor, shape)

			const delta = Vec2d.Sub(end, start)
			const v = Vec2d.Per(delta)

			const med = Vec2d.Med(end, start)
			const A = Vec2d.Sub(med, v)
			const B = Vec2d.Add(med, v)

			const point = Vec2d.NearestPointOnLineSegment(A, B, handle, false)
			let bend = Vec2d.Dist(point, med)
			if (Vec2d.Clockwise(point, end, med)) bend *= -1
			return { id: shape.id, type: shape.type, props: { bend } }
		}

		// Start or end, pointing the arrow...

		const next = deepCopy(shape) as TLArrowShape

		// always update the handle
		next.props[handleId] = {
			x: handle.x,
			y: handle.y,
		}

		const pageTransform = this.editor.getShapePageTransform(next.id)!
		const pointInPageSpace = pageTransform.applyToPoint(handle)
		const currentBinding = this.editor
			.getBindingsForShapeId(next.id, 'arrow')
			.find((b) => b.props.terminal === handleId)

		if (this.editor.inputs.ctrlKey) {
			// todo: maybe double check that this isn't equal to the other handle too?
			// Skip binding
			if (currentBinding) {
				this.editor.removeBindings([currentBinding.id])
				this.editor.setHintingShapes([])
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
			if (currentBinding) {
				this.editor.removeBindings([currentBinding.id])
				this.editor.setHintingShapes([])
			}
			next.props[handleId] = {
				x: handle.x,
				y: handle.y,
			}

			return next
		}

		// we've got a target! the handle is being dragged over a shape, bind to it

		const targetGeometry = this.editor.getShapeGeometry(target)
		const targetBounds = Box2d.ZeroFix(targetGeometry.bounds)
		const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pointInPageSpace)

		let precise = isPrecise

		const { startBinding, endBinding } = getArrowBindings(this.editor, next)
		const handleBinding = handleId === 'start' ? startBinding : endBinding
		const otherHandleBinding = handleId === 'start' ? endBinding : startBinding

		if (!precise) {
			// If we're switching to a new bound shape, then precise only if moving slowly
			if (handleBinding && target.id !== handleBinding.toShapeId) {
				precise = this.editor.inputs.pointerVelocity.len() < 0.5
			}
		}

		if (!isPrecise) {
			if (!targetGeometry.isClosed) {
				precise = true
			}

			// Double check that we're not going to be doing an imprecise snap on
			// the same shape twice, as this would result in a zero length line
			if (
				otherHandleBinding &&
				target.id === otherHandleBinding.toShapeId &&
				otherHandleBinding.props.isPrecise
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
				Vec2d.Dist(pointInTargetSpace, targetBounds.center) <
				Math.max(4, Math.min(Math.min(targetBounds.width, targetBounds.height) * 0.15, 16)) /
					this.editor.getZoomLevel()
			) {
				normalizedAnchor.x = 0.5
				normalizedAnchor.y = 0.5
			}
		}

		const nextBinding: TLArrowBinding = {
			id: currentBinding?.id ?? createBindingId(),
			typeName: 'binding',
			type: 'arrow',
			fromShapeId: next.id,
			toShapeId: target.id,
			meta: {},
			props: {
				terminal: handleId,
				isExact: this.editor.inputs.altKey,
				isPrecise: precise,
				normalizedAnchor,
			},
		}

		if (
			otherHandleBinding &&
			otherHandleBinding.toShapeId === target.id &&
			Vec2d.Equals(otherHandleBinding.props.normalizedAnchor, nextBinding.props.normalizedAnchor)
		) {
			nextBinding.props.normalizedAnchor.x += 0.05
		}

		this.editor.store.put([nextBinding])
		this.editor.setHintingShapes([target.id])

		return next
	}

	override onTranslateStart: TLOnTranslateStartHandler<TLArrowShape> = (shape) => {
		const { startBinding, endBinding } = getArrowBindings(this.editor, shape)

		// If at least one bound shape is in the selection, do nothing;
		// If no bound shapes are in the selection, unbind any bound shapes

		const selectedShapeIds = this.editor.getSelectedShapeIds()

		if (
			(startBinding &&
				(selectedShapeIds.includes(startBinding.toShapeId) ||
					this.editor.isAncestorSelected(startBinding.toShapeId))) ||
			(endBinding &&
				(selectedShapeIds.includes(endBinding.toShapeId) ||
					this.editor.isAncestorSelected(endBinding.toShapeId)))
		) {
			return
		}

		// break bindings
		this.editor.removeBindings(compact([startBinding?.id, endBinding?.id]))

		const { start, end } = getArrowTerminalsInArrowSpace(this.editor, shape)

		return {
			id: shape.id,
			type: shape.type,
			props: {
				...shape.props,
				start: {
					x: start.x,
					y: start.y,
				},
				end: {
					x: end.x,
					y: end.y,
				},
			},
		}
	}

	override onResize: TLOnResizeHandler<TLArrowShape> = (shape, info) => {
		const { scaleX, scaleY } = info

		const terminals = getArrowTerminalsInArrowSpace(this.editor, shape)

		const { start, end } = deepCopy<TLArrowShape['props']>(shape.props)
		let { bend } = shape.props

		// Rescale start handle if it's not bound to a shape
		start.x = terminals.start.x * scaleX
		start.y = terminals.start.y * scaleY

		// Rescale end handle if it's not bound to a shape
		end.x = terminals.end.x * scaleX
		end.y = terminals.end.y * scaleY

		// todo: we should only change the normalized anchor positions
		// of the shape's handles if the bound shape is also being resized

		const mx = Math.abs(scaleX)
		const my = Math.abs(scaleY)

		const { startBinding, endBinding } = getArrowBindings(this.editor, shape)

		if (scaleX < 0 && scaleY >= 0) {
			if (bend !== 0) {
				bend *= -1
				bend *= Math.max(mx, my)
			}

			if (startBinding) {
				startBinding.props.normalizedAnchor.x = 1 - startBinding.props.normalizedAnchor.x
			}

			if (endBinding) {
				endBinding.props.normalizedAnchor.x = 1 - endBinding.props.normalizedAnchor.x
			}
		} else if (scaleX >= 0 && scaleY < 0) {
			if (bend !== 0) {
				bend *= -1
				bend *= Math.max(mx, my)
			}

			if (startBinding) {
				startBinding.props.normalizedAnchor.y = 1 - startBinding.props.normalizedAnchor.y
			}

			if (endBinding) {
				endBinding.props.normalizedAnchor.y = 1 - endBinding.props.normalizedAnchor.y
			}
		} else if (scaleX >= 0 && scaleY >= 0) {
			if (bend !== 0) {
				bend *= Math.max(mx, my)
			}
		} else if (scaleX < 0 && scaleY < 0) {
			if (bend !== 0) {
				bend *= Math.max(mx, my)
			}

			if (startBinding) {
				startBinding.props.normalizedAnchor.x = 1 - startBinding.props.normalizedAnchor.x
				startBinding.props.normalizedAnchor.y = 1 - startBinding.props.normalizedAnchor.y
			}

			if (endBinding) {
				endBinding.props.normalizedAnchor.x = 1 - endBinding.props.normalizedAnchor.x
				endBinding.props.normalizedAnchor.y = 1 - endBinding.props.normalizedAnchor.y
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
			case 'start': {
				return {
					id: shape.id,
					type: shape.type,
					props: {
						...shape.props,
						arrowheadStart: shape.props.arrowheadStart === 'none' ? 'arrow' : 'none',
					},
				}
			}
			case 'end': {
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
				'arrow.dragging'
			) && !this.editor.getInstanceState().isReadonly

		const info = this.editor.getArrowInfo(shape)
		const bounds = Box2d.ZeroFix(this.editor.getShapeGeometry(shape).bounds)

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

		let handlePath: null | JSX.Element = null

		if (onlySelectedShape === shape && shouldDisplayHandles) {
			const sw = 2
			const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
				info.isStraight
					? Vec2d.Dist(info.start.handle, info.end.handle)
					: Math.abs(info.handleArc.length),
				sw,
				{
					end: 'skip',
					start: 'skip',
					lengthRatio: 2.5,
				}
			)
			const { startBinding, endBinding } = getArrowBindings(this.editor, shape)

			handlePath =
				startBinding || endBinding ? (
					<path
						className="tl-arrow-hint"
						d={info.isStraight ? getStraightArrowHandlePath(info) : getCurvedArrowHandlePath(info)}
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
						strokeWidth={sw}
						markerStart={
							startBinding
								? startBinding.props.isExact
									? ''
									: startBinding.props.isPrecise
									? 'url(#arrowhead-cross)'
									: 'url(#arrowhead-dot)'
								: ''
						}
						markerEnd={
							endBinding
								? endBinding.props.isExact
									? ''
									: endBinding.props.isPrecise
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
					position={info.middle}
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
		if (Vec2d.Equals(start, end)) return null

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

	unbindArrowTerminal = (arrow: TLArrowShape, handleId: 'start' | 'end') => {
		const { x, y } = getArrowTerminalsInArrowSpace(this.editor, arrow)[handleId]
		this.editor.store.put([
			{ ...arrow, props: { ...arrow.props, [handleId]: { x, y } } },
		])
	}

	arrowDidUpdate = (arrow: TLArrowShape) => {
		// if the shape is an arrow and its bound shape is on another page
		// or was deleted, unbind it
		const arrowBindings = this.editor.getBindingsForShapeId(arrow.id, 'arrow')
		for (const binding of arrowBindings) {
			const boundShape = this.editor.getShape(binding.toShapeId)
			if (
				!boundShape ||
				// if the arrow is bound to a shape on another page
				this.editor.getAncestorPageId(arrow) !== this.editor.getAncestorPageId(boundShape)
			) {
				this.unbindArrowTerminal(arrow, binding.props.terminal)
			}
		}

		// always check the arrow parents
		this.reparentArrow(arrow.id)
	}

	reparentArrow = (arrowId: TLArrowShape['id']) => {
		const arrow = this.editor.getShape<TLArrowShape>(arrowId)
		if (!arrow) return
		const bindings = this.editor.getBindingsForShapeId(arrowId, 'arrow')
		const startShapeId = bindings.find((b) => b.props.terminal === 'start')?.toShapeId
		const endShapeId = bindings.find((b) => b.props.terminal === 'end')?.toShapeId
		const startShape = startShapeId ? this.editor.getShape(startShapeId) : undefined
		const endShape = endShapeId ? this.editor.getShape(endShapeId) : undefined

		const parentPageId = this.editor.getAncestorPageId(arrow)
		if (!parentPageId) return

		let nextParentId: TLParentId
		if (startShape && endShape) {
			// if arrow has two bindings, always parent arrow to closest common ancestor of the bindings
			nextParentId = this.editor.findCommonAncestor([startShape, endShape]) ?? parentPageId
		} else if (startShape || endShape) {
			const bindingParentId = (startShape || endShape)?.parentId
			// If the arrow and the shape that it is bound to have the same parent, then keep that parent
			if (bindingParentId && bindingParentId === arrow.parentId) {
				nextParentId = arrow.parentId
			} else {
				// if arrow has one binding, keep arrow on its own page
				nextParentId = parentPageId
			}
		} else {
			return
		}

		if (nextParentId && nextParentId !== arrow.parentId) {
			this.editor.reparentShapes([arrowId], nextParentId)
		}

		const reparentedArrow = this.editor.getShape<TLArrowShape>(arrowId)
		if (!reparentedArrow) throw Error('no reparented arrow')

		const startSibling = this.editor.getShapeNearestSibling(reparentedArrow, startShape)
		const endSibling = this.editor.getShapeNearestSibling(reparentedArrow, endShape)

		let highestSibling: TLShape | undefined

		if (startSibling && endSibling) {
			highestSibling = startSibling.index > endSibling.index ? startSibling : endSibling
		} else if (startSibling && !endSibling) {
			highestSibling = startSibling
		} else if (endSibling && !startSibling) {
			highestSibling = endSibling
		} else {
			return
		}

		let finalIndex: string

		const higherSiblings = this.editor
			.getSortedChildIdsForParent(highestSibling.parentId)
			.map((id) => this.editor.getShape(id)!)
			.filter((sibling) => sibling.index > highestSibling!.index)

		if (higherSiblings.length) {
			// there are siblings above the highest bound sibling, we need to
			// insert between them.

			// if the next sibling is also a bound arrow though, we can end up
			// all fighting for the same indexes. so lets find the next
			// non-arrow sibling...
			const nextHighestNonArrowSibling = higherSiblings.find((sibling) => sibling.type !== 'arrow')

			if (
				// ...then, if we're above the last shape we want to be above...
				reparentedArrow.index > highestSibling.index &&
				// ...but below the next non-arrow sibling...
				(!nextHighestNonArrowSibling || reparentedArrow.index < nextHighestNonArrowSibling.index)
			) {
				// ...then we're already in the right place. no need to update!
				return
			}

			// otherwise, we need to find the index between the highest sibling
			// we want to be above, and the next highest sibling we want to be
			// below:
			finalIndex = getIndexBetween(highestSibling.index, higherSiblings[0].index)
		} else {
			// if there are no siblings above us, we can just get the next index:
			finalIndex = getIndexAbove(highestSibling.index)
		}

		if (finalIndex !== reparentedArrow.index) {
			this.editor.updateShapes<TLArrowShape>([{ id: arrowId, type: 'arrow', index: finalIndex }])
		}
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
