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
	TLArrowBinding,
	TLArrowShape,
	TLArrowShapeProps,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	TLShapePartial,
	TLShapeUtilCanBindOpts,
	TLShapeUtilCanvasSvgDef,
	Vec,
	WeakCache,
	arrowShapeMigrations,
	arrowShapeProps,
	getDefaultColorTheme,
	getPerfectDashProps,
	lerp,
	mapObjectMapValues,
	maybeSnapToGrid,
	structuredClone,
	toDomPrecision,
	track,
	useEditor,
	useIsEditing,
	useSharedSafeId,
	useValue,
} from '@tldraw/editor'
import React from 'react'
import { updateArrowTerminal } from '../../bindings/arrow/ArrowBindingUtil'

import { ShapeFill } from '../shared/ShapeFill'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextLabel } from '../shared/TextLabel'
import { ARROW_LABEL_PADDING, STROKE_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import {
	getFillDefForCanvas,
	getFillDefForExport,
	getFontDefForExport,
} from '../shared/defaultStyleDefs'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { getArrowLabelFontSize, getArrowLabelPosition } from './arrowLabel'
import { getArrowheadPathForType } from './arrowheads'
import {
	getCurvedArrowHandlePath,
	getSolidCurvedArrowPath,
	getSolidStraightArrowPath,
	getStraightArrowHandlePath,
} from './arrowpaths'
import {
	TLArrowBindings,
	createOrUpdateArrowBinding,
	getArrowBindings,
	getArrowInfo,
	getArrowTerminalsInArrowSpace,
	removeArrowBinding,
} from './shared'

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

	override canBeLaidOut(shape: TLArrowShape) {
		const bindings = getArrowBindings(this.editor, shape)
		return !bindings.start && !bindings.end
	}

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
			labelPosition: 0.5,
			font: 'draw',
			scale: 1,
		}
	}

	getGeometry(shape: TLArrowShape) {
		const info = getArrowInfo(this.editor, shape)!

		const debugGeom: Geometry2d[] = []

		const bodyGeom = info.isStraight
			? new Edge2d({
					start: Vec.From(info.start.point),
					end: Vec.From(info.end.point),
				})
			: new Arc2d({
					center: Vec.Cast(info.handleArc.center),
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
		const info = getArrowInfo(this.editor, shape)!

		return [
			{
				id: ARROW_HANDLES.START,
				type: 'vertex',
				index: 'a0',
				x: info.start.handle.x,
				y: info.start.handle.y,
			},
			{
				id: ARROW_HANDLES.MIDDLE,
				type: 'virtual',
				index: 'a2',
				x: info.middle.x,
				y: info.middle.y,
			},
			{
				id: ARROW_HANDLES.END,
				type: 'vertex',
				index: 'a3',
				x: info.end.handle.x,
				y: info.end.handle.y,
			},
		].filter(Boolean) as TLHandle[]
	}

	override getText(shape: TLArrowShape) {
		return shape.props.text
	}

	override onHandleDrag(
		shape: TLArrowShape,
		{ handle, isPrecise }: TLHandleDragInfo<TLArrowShape>
	) {
		const handleId = handle.id as ARROW_HANDLES
		const bindings = getArrowBindings(this.editor, shape)

		if (handleId === ARROW_HANDLES.MIDDLE) {
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

		// Start or end, pointing the arrow...

		const update: TLShapePartial<TLArrowShape> = { id: shape.id, type: 'arrow', props: {} }

		const currentBinding = bindings[handleId]

		const otherHandleId = handleId === ARROW_HANDLES.START ? ARROW_HANDLES.END : ARROW_HANDLES.START
		const otherBinding = bindings[otherHandleId]

		if (this.editor.inputs.ctrlKey) {
			// todo: maybe double check that this isn't equal to the other handle too?
			// Skip binding
			removeArrowBinding(this.editor, shape, handleId)

			update.props![handleId] = {
				x: handle.x,
				y: handle.y,
			}
			return update
		}

		const point = this.editor.getShapePageTransform(shape.id)!.applyToPoint(handle)

		const target = this.editor.getShapeAtPoint(point, {
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

		if (!target) {
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

		const targetGeometry = this.editor.getShapeGeometry(target)
		const targetBounds = Box.ZeroFix(targetGeometry.bounds)
		const pageTransform = this.editor.getShapePageTransform(update.id)!
		const pointInPageSpace = pageTransform.applyToPoint(handle)
		const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pointInPageSpace)

		let precise = isPrecise

		if (!precise) {
			// If we're switching to a new bound shape, then precise only if moving slowly
			if (!currentBinding || (currentBinding && target.id !== currentBinding.toId)) {
				precise = this.editor.inputs.pointerVelocity.len() < 0.5
			}
		}

		if (!isPrecise) {
			if (!targetGeometry.isClosed) {
				precise = true
			}

			// Double check that we're not going to be doing an imprecise snap on
			// the same shape twice, as this would result in a zero length line
			if (otherBinding && target.id === otherBinding.toId && otherBinding.props.isPrecise) {
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

		const b = {
			terminal: handleId,
			normalizedAnchor,
			isPrecise: precise,
			isExact: this.editor.inputs.altKey,
		}

		createOrUpdateArrowBinding(this.editor, shape, target.id, b)

		this.editor.setHintingShapes([target.id])

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

		for (const handleName of [ARROW_HANDLES.START, ARROW_HANDLES.END] as const) {
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
		const showArrowLabel = isEditing || shape.props.text

		return (
			<>
				<SVGContainer style={{ minWidth: 50, minHeight: 50 }}>
					<ArrowSvg
						shape={shape}
						shouldDisplayHandles={shouldDisplayHandles && onlySelectedShape?.id === shape.id}
					/>
				</SVGContainer>
				{showArrowLabel && (
					<TextLabel
						shapeId={shape.id}
						classNamePrefix="tl-arrow"
						type="arrow"
						font={shape.props.font}
						fontSize={getArrowLabelFontSize(shape)}
						lineHeight={TEXT_PROPS.lineHeight}
						align="middle"
						verticalAlign="middle"
						text={shape.props.text}
						labelColor={theme[shape.props.labelColor].solid}
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

		const labelGeometry = shape.props.text.trim() ? (geometry.children[1] as Rectangle2d) : null

		if (Vec.Equals(start, end)) return null

		const strokeWidth = STROKE_SIZES[shape.props.size] * shape.props.scale

		const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
		const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

		const path = info.isStraight ? getSolidStraightArrowPath(info) : getSolidCurvedArrowPath(info)

		const includeClipPath =
			(as && info.start.arrowhead !== 'arrow') ||
			(ae && info.end.arrowhead !== 'arrow') ||
			!!labelGeometry

		if (isEditing && labelGeometry) {
			return (
				<rect
					x={toDomPrecision(labelGeometry.x)}
					y={toDomPrecision(labelGeometry.y)}
					width={labelGeometry.w}
					height={labelGeometry.h}
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
							hasText={shape.props.text.trim().length > 0}
							bounds={bounds}
							labelBounds={labelGeometry ? labelGeometry.getBounds() : new Box(0, 0, 0, 0)}
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

	override onEditEnd(shape: TLArrowShape) {
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
		const theme = getDefaultColorTheme(ctx)
		const scaleFactor = 1 / shape.props.scale

		return (
			<g transform={`scale(${scaleFactor})`}>
				<ArrowSvg shape={shape} shouldDisplayHandles={false} />
				<SvgTextLabel
					fontSize={getArrowLabelFontSize(shape)}
					font={shape.props.font}
					align="middle"
					verticalAlign="middle"
					text={shape.props.text}
					labelColor={theme[shape.props.labelColor].solid}
					bounds={getArrowLabelPosition(this.editor, shape)
						.box.clone()
						.expandBy(-ARROW_LABEL_PADDING * shape.props.scale)}
					padding={0}
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
	const info = getArrowInfo(editor, shape)
	const bounds = Box.ZeroFix(editor.getShapeGeometry(shape).bounds)
	const bindings = getArrowBindings(editor, shape)
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

	if (!info?.isValid) return null

	const strokeWidth = STROKE_SIZES[shape.props.size] * shape.props.scale

	const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
	const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

	const path = info.isStraight ? getSolidStraightArrowPath(info) : getSolidCurvedArrowPath(info)

	let handlePath: null | React.JSX.Element = null

	if (shouldDisplayHandles) {
		const sw = 2 / editor.getZoomLevel()
		const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
			getArrowLength(editor, shape),
			sw,
			{
				end: 'skip',
				start: 'skip',
				lengthRatio: 2.5,
			}
		)

		handlePath =
			bindings.start || bindings.end ? (
				<path
					className="tl-arrow-hint"
					d={info.isStraight ? getStraightArrowHandlePath(info) : getCurvedArrowHandlePath(info)}
					strokeDasharray={strokeDasharray}
					strokeDashoffset={strokeDashoffset}
					strokeWidth={sw}
					markerStart={
						bindings.start
							? bindings.start.props.isExact
								? ''
								: bindings.start.props.isPrecise
									? `url(#${arrowheadCrossId})`
									: `url(#${arrowheadDotId})`
							: ''
					}
					markerEnd={
						bindings.end
							? bindings.end.props.isExact
								? ''
								: bindings.end.props.isPrecise
									? `url(#${arrowheadCrossId})`
									: `url(#${arrowheadDotId})`
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
			forceSolid: isForceSolid,
		}
	)

	const labelPosition = getArrowLabelPosition(editor, shape)

	const clipStartArrowhead = !(info.start.arrowhead === 'none' || info.start.arrowhead === 'arrow')
	const clipEndArrowhead = !(info.end.arrowhead === 'none' || info.end.arrowhead === 'arrow')

	return (
		<>
			{/* Yep */}
			<defs>
				<clipPath id={clipPathId}>
					<ArrowClipPath
						hasText={shape.props.text.trim().length > 0}
						bounds={bounds}
						labelBounds={labelPosition.box}
						as={clipStartArrowhead && as ? as : ''}
						ae={clipEndArrowhead && ae ? ae : ''}
					/>
				</clipPath>
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
					<path d={path} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
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
	hasText,
	bounds,
	labelBounds,
	as,
	ae,
}: {
	hasText: boolean
	bounds: Box
	labelBounds: Box
	as: string
	ae: string
}) {
	// The direction in which we create the different path parts is important, as it determines what gets clipped.
	// See the description on the directions in the non-zero fill rule example:
	// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule#nonzero
	// We create this one in the clockwise direction
	const boundingBoxPath = `M${toDomPrecision(bounds.minX - 100)},${toDomPrecision(bounds.minY - 100)} h${bounds.width + 200} v${bounds.height + 200} h-${bounds.width + 200} Z`
	// We create this one in the counter-clockwise direction, which cuts out the label box
	const labelBoxPath = `M${toDomPrecision(labelBounds.minX)},${toDomPrecision(labelBounds.minY)} v${labelBounds.height} h${labelBounds.width} v-${labelBounds.height} Z`
	// We also append the arrowhead paths to the clip path, so that we also clip the arrowheads
	return <path d={`${boundingBoxPath}${hasText ? labelBoxPath : ''}${as}${ae}`} />
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
