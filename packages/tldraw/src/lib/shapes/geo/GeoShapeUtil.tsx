/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	Box,
	Editor,
	Ellipse2d,
	Geometry2d,
	Group2d,
	HALF_PI,
	HTMLContainer,
	HandleSnapGeometry,
	PI2,
	Polygon2d,
	Polyline2d,
	Rectangle2d,
	SVGContainer,
	Stadium2d,
	SvgExportContext,
	TLGeoShape,
	TLGeoShapeProps,
	TLResizeInfo,
	TLShapeUtilCanvasSvgDef,
	Vec,
	exhaustiveSwitchError,
	geoShapeMigrations,
	geoShapeProps,
	getDefaultColorTheme,
	getPolygonVertices,
	lerp,
	useValue,
} from '@tldraw/editor'

import { HyperlinkButton } from '../shared/HyperlinkButton'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextLabel } from '../shared/TextLabel'
import {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	STROKE_SIZES,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import {
	getFillDefForCanvas,
	getFillDefForExport,
	getFontDefForExport,
} from '../shared/defaultStyleDefs'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { GeoShapeBody } from './components/GeoShapeBody'
import {
	cloudOutline,
	getCloudPath,
	getEllipseDrawIndicatorPath,
	getHeartParts,
	getHeartPath,
	getRoundedInkyPolygonPath,
	getRoundedPolygonPoints,
} from './geo-shape-helpers'
import { getLines } from './getLines'

const MIN_SIZE_WITH_LABEL = 17 * 3

/** @public */
export class GeoShapeUtil extends BaseBoxShapeUtil<TLGeoShape> {
	static override type = 'geo' as const
	static override props = geoShapeProps
	static override migrations = geoShapeMigrations

	override canEdit() {
		return true
	}

	override getDefaultProps(): TLGeoShape['props'] {
		return {
			w: 100,
			h: 100,
			geo: 'rectangle',
			color: 'black',
			labelColor: 'black',
			fill: 'none',
			dash: 'draw',
			size: 'm',
			font: 'draw',
			text: '',
			align: 'middle',
			verticalAlign: 'middle',
			growY: 0,
			url: '',
			scale: 1,
		}
	}

	override getGeometry(shape: TLGeoShape) {
		const w = Math.max(1, shape.props.w)
		const h = Math.max(1, shape.props.h + shape.props.growY)
		const cx = w / 2
		const cy = h / 2

		const isFilled = shape.props.fill !== 'none' // || shape.props.text.trim().length > 0

		let body: Geometry2d

		switch (shape.props.geo) {
			case 'cloud': {
				body = new Polygon2d({
					points: cloudOutline(w, h, shape.id, shape.props.size, shape.props.scale),
					isFilled,
				})
				break
			}
			case 'triangle': {
				body = new Polygon2d({
					points: [new Vec(cx, 0), new Vec(w, h), new Vec(0, h)],
					isFilled,
				})
				break
			}
			case 'diamond': {
				body = new Polygon2d({
					points: [new Vec(cx, 0), new Vec(w, cy), new Vec(cx, h), new Vec(0, cy)],
					isFilled,
				})
				break
			}
			case 'pentagon': {
				body = new Polygon2d({
					points: getPolygonVertices(w, h, 5),
					isFilled,
				})
				break
			}
			case 'hexagon': {
				body = new Polygon2d({
					points: getPolygonVertices(w, h, 6),
					isFilled,
				})
				break
			}
			case 'octagon': {
				body = new Polygon2d({
					points: getPolygonVertices(w, h, 8),
					isFilled,
				})
				break
			}
			case 'ellipse': {
				body = new Ellipse2d({
					width: w,
					height: h,
					isFilled,
				})
				break
			}
			case 'oval': {
				body = new Stadium2d({
					width: w,
					height: h,
					isFilled,
				})
				break
			}
			case 'star': {
				// Most of this code is to offset the center, a 5 point star
				// will need to be moved downward because from its center [0,0]
				// it will have a bigger minY than maxY. This is because it'll
				// have 2 points at the bottom.
				const sides = 5
				const step = PI2 / sides / 2
				const rightMostIndex = Math.floor(sides / 4) * 2
				const leftMostIndex = sides * 2 - rightMostIndex
				const topMostIndex = 0
				const bottomMostIndex = Math.floor(sides / 2) * 2
				const maxX = (Math.cos(-HALF_PI + rightMostIndex * step) * w) / 2
				const minX = (Math.cos(-HALF_PI + leftMostIndex * step) * w) / 2

				const minY = (Math.sin(-HALF_PI + topMostIndex * step) * h) / 2
				const maxY = (Math.sin(-HALF_PI + bottomMostIndex * step) * h) / 2
				const diffX = w - Math.abs(maxX - minX)
				const diffY = h - Math.abs(maxY - minY)
				const offsetX = w / 2 + minX - (w / 2 - maxX)
				const offsetY = h / 2 + minY - (h / 2 - maxY)

				const ratio = 1
				const cx = (w - offsetX) / 2
				const cy = (h - offsetY) / 2
				const ox = (w + diffX) / 2
				const oy = (h + diffY) / 2
				const ix = (ox * ratio) / 2
				const iy = (oy * ratio) / 2

				body = new Polygon2d({
					points: Array.from(Array(sides * 2)).map((_, i) => {
						const theta = -HALF_PI + i * step
						return new Vec(
							cx + (i % 2 ? ix : ox) * Math.cos(theta),
							cy + (i % 2 ? iy : oy) * Math.sin(theta)
						)
					}),
					isFilled,
				})
				break
			}
			case 'rhombus': {
				const offset = Math.min(w * 0.38, h * 0.38)
				body = new Polygon2d({
					points: [new Vec(offset, 0), new Vec(w, 0), new Vec(w - offset, h), new Vec(0, h)],
					isFilled,
				})
				break
			}
			case 'rhombus-2': {
				const offset = Math.min(w * 0.38, h * 0.38)
				body = new Polygon2d({
					points: [new Vec(0, 0), new Vec(w - offset, 0), new Vec(w, h), new Vec(offset, h)],
					isFilled,
				})
				break
			}
			case 'trapezoid': {
				const offset = Math.min(w * 0.38, h * 0.38)
				body = new Polygon2d({
					points: [new Vec(offset, 0), new Vec(w - offset, 0), new Vec(w, h), new Vec(0, h)],
					isFilled,
				})
				break
			}
			case 'arrow-right': {
				const ox = Math.min(w, h) * 0.38
				const oy = h * 0.16
				body = new Polygon2d({
					points: [
						new Vec(0, oy),
						new Vec(w - ox, oy),
						new Vec(w - ox, 0),
						new Vec(w, h / 2),
						new Vec(w - ox, h),
						new Vec(w - ox, h - oy),
						new Vec(0, h - oy),
					],
					isFilled,
				})
				break
			}
			case 'arrow-left': {
				const ox = Math.min(w, h) * 0.38
				const oy = h * 0.16
				body = new Polygon2d({
					points: [
						new Vec(ox, 0),
						new Vec(ox, oy),
						new Vec(w, oy),
						new Vec(w, h - oy),
						new Vec(ox, h - oy),
						new Vec(ox, h),
						new Vec(0, h / 2),
					],
					isFilled,
				})
				break
			}
			case 'arrow-up': {
				const ox = w * 0.16
				const oy = Math.min(w, h) * 0.38
				body = new Polygon2d({
					points: [
						new Vec(w / 2, 0),
						new Vec(w, oy),
						new Vec(w - ox, oy),
						new Vec(w - ox, h),
						new Vec(ox, h),
						new Vec(ox, oy),
						new Vec(0, oy),
					],
					isFilled,
				})
				break
			}
			case 'arrow-down': {
				const ox = w * 0.16
				const oy = Math.min(w, h) * 0.38
				body = new Polygon2d({
					points: [
						new Vec(ox, 0),
						new Vec(w - ox, 0),
						new Vec(w - ox, h - oy),
						new Vec(w, h - oy),
						new Vec(w / 2, h),
						new Vec(0, h - oy),
						new Vec(ox, h - oy),
					],
					isFilled,
				})
				break
			}
			case 'check-box':
			case 'x-box':
			case 'rectangle': {
				body = new Rectangle2d({
					width: w,
					height: h,
					isFilled,
				})
				break
			}
			case 'heart': {
				// kind of expensive (creating the primitives to create a different primitive) but hearts are rare and beautiful things
				const parts = getHeartParts(w, h)
				const points = parts.reduce<Vec[]>((acc, part) => {
					acc.push(...part.vertices)
					return acc
				}, [])

				body = new Polygon2d({
					points,
					isFilled,
				})
				break
			}
			default: {
				exhaustiveSwitchError(shape.props.geo)
			}
		}

		const unscaledlabelSize = getUnscaledLabelSize(this.editor, shape)
		// unscaled w and h
		const unscaledW = w / shape.props.scale
		const unscaledH = h / shape.props.scale
		const unscaledminWidth = Math.min(100, unscaledW / 2)
		const unscaledMinHeight = Math.min(
			LABEL_FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight + LABEL_PADDING * 2,
			unscaledH / 2
		)

		const unscaledLabelWidth = Math.min(
			unscaledW,
			Math.max(unscaledlabelSize.w, Math.min(unscaledminWidth, Math.max(1, unscaledW - 8)))
		)
		const unscaledLabelHeight = Math.min(
			unscaledH,
			Math.max(unscaledlabelSize.h, Math.min(unscaledMinHeight, Math.max(1, unscaledH - 8)))
		)

		// not sure if bug

		const lines = getLines(shape.props, STROKE_SIZES[shape.props.size] * shape.props.scale)
		const edges = lines ? lines.map((line) => new Polyline2d({ points: line })) : []

		// todo: use centroid for label position

		return new Group2d({
			children: [
				body,
				new Rectangle2d({
					x:
						shape.props.align === 'start'
							? 0
							: shape.props.align === 'end'
								? (unscaledW - unscaledLabelWidth) * shape.props.scale
								: ((unscaledW - unscaledLabelWidth) / 2) * shape.props.scale,
					y:
						shape.props.verticalAlign === 'start'
							? 0
							: shape.props.verticalAlign === 'end'
								? (unscaledH - unscaledLabelHeight) * shape.props.scale
								: ((unscaledH - unscaledLabelHeight) / 2) * shape.props.scale,
					width: unscaledLabelWidth * shape.props.scale,
					height: unscaledLabelHeight * shape.props.scale,
					isFilled: true,
					isLabel: true,
				}),
				...edges,
			],
		})
	}

	override getHandleSnapGeometry(shape: TLGeoShape): HandleSnapGeometry {
		const geometry = this.getGeometry(shape)
		// we only want to snap handles to the outline of the shape - not to its label etc.
		const outline = geometry.children[0]
		switch (shape.props.geo) {
			case 'arrow-down':
			case 'arrow-left':
			case 'arrow-right':
			case 'arrow-up':
			case 'check-box':
			case 'diamond':
			case 'hexagon':
			case 'octagon':
			case 'pentagon':
			case 'rectangle':
			case 'rhombus':
			case 'rhombus-2':
			case 'star':
			case 'trapezoid':
			case 'triangle':
			case 'x-box':
				// poly-line type shapes hand snap points for each vertex & the center
				return { outline: outline, points: [...outline.getVertices(), geometry.bounds.center] }
			case 'cloud':
			case 'ellipse':
			case 'heart':
			case 'oval':
				// blobby shapes only have a snap point in their center
				return { outline: outline, points: [geometry.bounds.center] }
			default:
				exhaustiveSwitchError(shape.props.geo)
		}
	}

	override getText(shape: TLGeoShape) {
		return shape.props.text
	}

	override onEditEnd(shape: TLGeoShape) {
		const {
			id,
			type,
			props: { text },
		} = shape

		if (text.trimEnd() !== shape.props.text) {
			this.editor.updateShapes([
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

	component(shape: TLGeoShape) {
		const { id, type, props } = shape
		const { fill, font, align, verticalAlign, size, text } = props
		const theme = useDefaultColorTheme()
		const { editor } = this
		const isOnlySelected = useValue(
			'isGeoOnlySelected',
			() => shape.id === editor.getOnlySelectedShapeId(),
			[]
		)
		const isEditingAnything = editor.getEditingShapeId() !== null
		const showHtmlContainer = isEditingAnything || shape.props.text
		const isForceSolid = useValue(
			'force solid',
			() => {
				return editor.getZoomLevel() < 0.2
			},
			[editor]
		)

		return (
			<>
				<SVGContainer id={id}>
					<GeoShapeBody shape={shape} shouldScale={true} forceSolid={isForceSolid} />
				</SVGContainer>
				{showHtmlContainer && (
					<HTMLContainer
						style={{
							overflow: 'hidden',
							width: shape.props.w,
							height: shape.props.h + props.growY,
						}}
					>
						<TextLabel
							id={id}
							type={type}
							font={font}
							fontSize={LABEL_FONT_SIZES[size] * shape.props.scale}
							lineHeight={TEXT_PROPS.lineHeight}
							padding={LABEL_PADDING * shape.props.scale}
							fill={fill}
							align={align}
							verticalAlign={verticalAlign}
							text={text}
							isSelected={isOnlySelected}
							labelColor={theme[props.labelColor].solid}
							wrap
						/>
					</HTMLContainer>
				)}
				{shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
				)}
			</>
		)
	}

	indicator(shape: TLGeoShape) {
		const { id, props } = shape
		const { w, size } = props
		const h = props.h + props.growY

		const strokeWidth = STROKE_SIZES[size]

		const geometry = this.editor.getShapeGeometry(shape)

		switch (props.geo) {
			case 'ellipse': {
				if (props.dash === 'draw') {
					return <path d={getEllipseDrawIndicatorPath(id, w, h, strokeWidth)} />
				}

				return <path d={geometry.getSvgPathData(true)} />
			}
			case 'heart': {
				return <path d={getHeartPath(w, h)} />
			}
			case 'oval': {
				return <path d={geometry.getSvgPathData(true)} />
			}
			case 'cloud': {
				return <path d={getCloudPath(w, h, id, size, shape.props.scale)} />
			}

			default: {
				const geometry = this.editor.getShapeGeometry(shape)
				const outline =
					geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices
				let path: string

				if (props.dash === 'draw') {
					const polygonPoints = getRoundedPolygonPoints(
						id,
						outline,
						0,
						strokeWidth * 2 * shape.props.scale,
						1
					)
					path = getRoundedInkyPolygonPath(polygonPoints)
				} else {
					path = 'M' + outline[0] + 'L' + outline.slice(1) + 'Z'
				}

				const lines = getLines(shape.props, strokeWidth)

				if (lines) {
					for (const [A, B] of lines) {
						path += `M${A.x},${A.y}L${B.x},${B.y}`
					}
				}

				return <path d={path} />
			}
		}
	}

	override toSvg(shape: TLGeoShape, ctx: SvgExportContext) {
		// We need to scale the shape to 1x for export
		const newShape = {
			...shape,
			props: {
				...shape.props,
				w: shape.props.w / shape.props.scale,
				h: shape.props.h / shape.props.scale,
			},
		}
		const props = newShape.props
		ctx.addExportDef(getFillDefForExport(props.fill))

		let textEl
		if (props.text) {
			ctx.addExportDef(getFontDefForExport(props.font))
			const theme = getDefaultColorTheme(ctx)

			const bounds = new Box(0, 0, props.w, props.h + props.growY)
			textEl = (
				<SvgTextLabel
					fontSize={LABEL_FONT_SIZES[props.size]}
					font={props.font}
					align={props.align}
					verticalAlign={props.verticalAlign}
					text={props.text}
					labelColor={theme[props.labelColor].solid}
					bounds={bounds}
					padding={16}
				/>
			)
		}

		return (
			<>
				<GeoShapeBody shouldScale={false} shape={newShape} forceSolid={false} />
				{textEl}
			</>
		)
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [getFillDefForCanvas()]
	}

	override onResize(
		shape: TLGeoShape,
		{ handle, newPoint, scaleX, scaleY, initialShape }: TLResizeInfo<TLGeoShape>
	) {
		const unscaledInitialW = initialShape.props.w / initialShape.props.scale
		const unscaledInitialH = initialShape.props.h / initialShape.props.scale
		const unscaledGrowY = initialShape.props.growY / initialShape.props.scale
		// use the w/h from props here instead of the initialBounds here,
		// since cloud shapes calculated bounds can differ from the props w/h.
		let unscaledW = unscaledInitialW * scaleX
		let unscaledH = (unscaledInitialH + unscaledGrowY) * scaleY
		let overShrinkX = 0
		let overShrinkY = 0

		const min = MIN_SIZE_WITH_LABEL

		if (shape.props.text.trim()) {
			let newW = Math.max(Math.abs(unscaledW), min)
			let newH = Math.max(Math.abs(unscaledH), min)

			if (newW < min && newH === min) newW = min
			if (newW === min && newH < min) newH = min

			const unscaledLabelSize = getUnscaledLabelSize(this.editor, {
				...shape,
				props: {
					...shape.props,
					w: newW * shape.props.scale,
					h: newH * shape.props.scale,
				},
			})

			const nextW = Math.max(Math.abs(unscaledW), unscaledLabelSize.w) * Math.sign(unscaledW)
			const nextH = Math.max(Math.abs(unscaledH), unscaledLabelSize.h) * Math.sign(unscaledH)
			overShrinkX = Math.abs(nextW) - Math.abs(unscaledW)
			overShrinkY = Math.abs(nextH) - Math.abs(unscaledH)

			unscaledW = nextW
			unscaledH = nextH
		}

		const scaledW = unscaledW * shape.props.scale
		const scaledH = unscaledH * shape.props.scale

		const offset = new Vec(0, 0)

		// x offsets

		if (scaleX < 0) {
			offset.x += scaledW
		}

		if (handle === 'left' || handle === 'top_left' || handle === 'bottom_left') {
			offset.x += scaleX < 0 ? overShrinkX : -overShrinkX
		}

		// y offsets

		if (scaleY < 0) {
			offset.y += scaledH
		}

		if (handle === 'top' || handle === 'top_left' || handle === 'top_right') {
			offset.y += scaleY < 0 ? overShrinkY : -overShrinkY
		}

		const { x, y } = offset.rot(shape.rotation).add(newPoint)

		return {
			x,
			y,
			props: {
				w: Math.max(Math.abs(scaledW), 1),
				h: Math.max(Math.abs(scaledH), 1),
				growY: 0,
			},
		}
	}

	override onBeforeCreate(shape: TLGeoShape) {
		if (!shape.props.text) {
			if (shape.props.growY) {
				// No text / some growY, set growY to 0
				return {
					...shape,
					props: {
						...shape.props,
						growY: 0,
					},
				}
			} else {
				// No text / no growY, nothing to change
				return
			}
		}

		const unscaledPrevHeight = shape.props.h / shape.props.scale
		const unscaledNextHeight = getUnscaledLabelSize(this.editor, shape).h

		let growY: number | null = null

		if (unscaledNextHeight > unscaledPrevHeight) {
			growY = unscaledNextHeight - unscaledPrevHeight
		} else {
			if (shape.props.growY) {
				growY = 0
			}
		}

		if (growY !== null) {
			return {
				...shape,
				props: {
					...shape.props,
					// scale the growY
					growY: growY * shape.props.scale,
				},
			}
		}
	}

	override onBeforeUpdate(prev: TLGeoShape, next: TLGeoShape) {
		const prevText = prev.props.text
		const nextText = next.props.text

		// No change to text, font, or size, no need to update update
		if (
			prevText === nextText &&
			prev.props.font === next.props.font &&
			prev.props.size === next.props.size
		) {
			return
		}

		// If we got rid of the text, cancel out any growY from the prev text
		if (prevText && !nextText) {
			return {
				...next,
				props: {
					...next.props,
					growY: 0,
				},
			}
		}

		// Get the prev width and height in unscaled values
		const unscaledPrevWidth = prev.props.w / prev.props.scale
		const unscaledPrevHeight = prev.props.h / prev.props.scale
		const unscaledPrevGrowY = prev.props.growY / prev.props.scale

		// Get the next width and height in unscaled values
		const unscaledNextLabelSize = getUnscaledLabelSize(this.editor, next)

		// When entering the first character in a label (not pasting in multiple characters...)
		if (!prevText && nextText && nextText.length === 1) {
			let unscaledW = Math.max(unscaledPrevWidth, unscaledNextLabelSize.w)
			let unscaledH = Math.max(unscaledPrevHeight, unscaledNextLabelSize.h)

			const min = MIN_SIZE_WITH_LABEL

			// If both the width and height were less than the minimum size, make the shape square
			if (unscaledPrevWidth < min && unscaledPrevHeight < min) {
				unscaledW = Math.max(unscaledW, min)
				unscaledH = Math.max(unscaledH, min)
				unscaledW = Math.max(unscaledW, unscaledH)
				unscaledH = Math.max(unscaledW, unscaledH)
			}

			// Don't set a growY—at least, not until we've implemented a growX property
			return {
				...next,
				props: {
					...next.props,
					// Scale the results
					w: unscaledW * next.props.scale,
					h: unscaledH * next.props.scale,
					growY: 0,
				},
			}
		}

		let growY: number | null = null

		if (unscaledNextLabelSize.h > unscaledPrevHeight) {
			growY = unscaledNextLabelSize.h - unscaledPrevHeight
		} else {
			if (unscaledPrevGrowY) {
				growY = 0
			}
		}

		if (growY !== null) {
			const unscaledNextWidth = next.props.w / next.props.scale
			return {
				...next,
				props: {
					...next.props,
					// Scale the results
					growY: growY * next.props.scale,
					w: Math.max(unscaledNextWidth, unscaledNextLabelSize.w) * next.props.scale,
				},
			}
		}

		if (unscaledNextLabelSize.w > unscaledPrevWidth) {
			return {
				...next,
				props: {
					...next.props,
					// Scale the results
					w: unscaledNextLabelSize.w * next.props.scale,
				},
			}
		}

		// otherwise, no update needed
	}

	override onDoubleClick(shape: TLGeoShape) {
		// Little easter egg: double-clicking a rectangle / checkbox while
		// holding alt will toggle between check-box and rectangle
		if (this.editor.inputs.altKey) {
			switch (shape.props.geo) {
				case 'rectangle': {
					return {
						...shape,
						props: {
							geo: 'check-box' as const,
						},
					}
				}
				case 'check-box': {
					return {
						...shape,
						props: {
							geo: 'rectangle' as const,
						},
					}
				}
			}
		}

		return
	}
	override getInterpolatedProps(
		startShape: TLGeoShape,
		endShape: TLGeoShape,
		t: number
	): TLGeoShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
			scale: lerp(startShape.props.scale, endShape.props.scale, t),
		}
	}
}

function getUnscaledLabelSize(editor: Editor, shape: TLGeoShape) {
	const { text, font, size, w } = shape.props

	if (!text) {
		return { w: 0, h: 0 }
	}

	const minSize = editor.textMeasure.measureText('w', {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: LABEL_FONT_SIZES[size],
		maxWidth: 100, // ?
	})

	// TODO: Can I get these from somewhere?
	const sizes = {
		s: 2,
		m: 3.5,
		l: 5,
		xl: 10,
	}

	const textSize = editor.textMeasure.measureText(text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: LABEL_FONT_SIZES[size],
		minWidth: minSize.w,
		maxWidth: Math.max(
			// Guard because a DOM nodes can't be less 0
			0,
			// A 'w' width that we're setting as the min-width
			Math.ceil(minSize.w + sizes[size]),
			// The actual text size
			Math.ceil(w / shape.props.scale - LABEL_PADDING * 2)
		),
	})

	return {
		w: textSize.w + LABEL_PADDING * 2,
		h: textSize.h + LABEL_PADDING * 2,
	}
}
