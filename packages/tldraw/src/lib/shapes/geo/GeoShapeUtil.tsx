/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
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
	TLOnEditEndHandler,
	TLOnResizeHandler,
	TLShapeUtilCanvasSvgDef,
	Vec,
	exhaustiveSwitchError,
	geoShapeMigrations,
	geoShapeProps,
	getDefaultColorTheme,
	getPolygonVertices,
} from '@tldraw/editor'

import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useDefaultColorTheme } from '../shared/ShapeFill'
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
import { getRoundedInkyPolygonPath, getRoundedPolygonPoints } from '../shared/polygon-helpers'
import { cloudOutline, cloudSvgPath } from './cloudOutline'
import { getEllipseIndicatorPath } from './components/DrawStyleEllipse'
import { GeoShapeBody } from './components/GeoShapeBody'
import { getOvalIndicatorPath } from './components/SolidStyleOval'
import { getLines } from './getLines'

const MIN_SIZE_WITH_LABEL = 17 * 3

/** @public */
export class GeoShapeUtil extends BaseBoxShapeUtil<TLGeoShape> {
	static override type = 'geo' as const
	static override props = geoShapeProps
	static override migrations = geoShapeMigrations

	override canEdit = () => true

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
		}
	}

	override getGeometry(shape: TLGeoShape) {
		const w = Math.max(1, shape.props.w)
		const h = Math.max(1, shape.props.h + shape.props.growY)
		const cx = w / 2
		const cy = h / 2

		const strokeWidth = STROKE_SIZES[shape.props.size]
		const isFilled = shape.props.fill !== 'none' // || shape.props.text.trim().length > 0

		let body: Geometry2d

		switch (shape.props.geo) {
			case 'cloud': {
				body = new Polygon2d({
					points: cloudOutline(w, h, shape.id, shape.props.size),
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
		}

		const labelSize = getLabelSize(this.editor, shape)
		const minWidth = Math.min(100, w / 2)
		const labelWidth = Math.min(w, Math.max(labelSize.w, Math.min(minWidth, Math.max(1, w - 8))))
		const minHeight = Math.min(
			LABEL_FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight + LABEL_PADDING * 2,
			h / 2
		)
		const labelHeight = Math.min(h, Math.max(labelSize.h, Math.min(minHeight, Math.max(1, w - 8)))) // not sure if bug

		const lines = getLines(shape.props, strokeWidth)
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
								? w - labelWidth
								: (w - labelWidth) / 2,
					y:
						shape.props.verticalAlign === 'start'
							? 0
							: shape.props.verticalAlign === 'end'
								? h - labelHeight
								: (h - labelHeight) / 2,
					width: labelWidth,
					height: labelHeight,
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
			case 'oval':
				// blobby shapes only have a snap point in their center
				return { outline: outline, points: [geometry.bounds.center] }
			default:
				exhaustiveSwitchError(shape.props.geo)
		}
	}

	override onEditEnd: TLOnEditEndHandler<TLGeoShape> = (shape) => {
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
		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()
		const theme = useDefaultColorTheme()
		const isEditingAnything = this.editor.getEditingShapeId() !== null
		const showHtmlContainer = isEditingAnything || shape.props.text

		return (
			<>
				<SVGContainer id={id}>
					<GeoShapeBody shape={shape} />
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
							fontSize={LABEL_FONT_SIZES[size]}
							lineHeight={TEXT_PROPS.lineHeight}
							fill={fill}
							align={align}
							verticalAlign={verticalAlign}
							text={text}
							isSelected={isSelected}
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

		switch (props.geo) {
			case 'ellipse': {
				if (props.dash === 'draw') {
					return <path d={getEllipseIndicatorPath(id, w, h, strokeWidth)} />
				}

				return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} />
			}
			case 'oval': {
				return <path d={getOvalIndicatorPath(w, h)} />
			}
			case 'cloud': {
				return <path d={cloudSvgPath(w, h, id, size)} />
			}

			default: {
				const geometry = this.editor.getShapeGeometry(shape)
				const outline =
					geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices
				let path: string

				if (props.dash === 'draw') {
					const polygonPoints = getRoundedPolygonPoints(id, outline, 0, strokeWidth * 2, 1)
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
		const { props } = shape
		ctx.addExportDef(getFillDefForExport(shape.props.fill))

		let textEl
		if (props.text) {
			ctx.addExportDef(getFontDefForExport(shape.props.font))
			const theme = getDefaultColorTheme(ctx)

			const bounds = this.editor.getShapeGeometry(shape).bounds
			textEl = (
				<SvgTextLabel
					fontSize={LABEL_FONT_SIZES[props.size]}
					font={props.font}
					align={props.align}
					verticalAlign={props.verticalAlign}
					text={props.text}
					labelColor={theme[props.labelColor].solid}
					bounds={bounds}
				/>
			)
		}

		return (
			<>
				<GeoShapeBody shape={shape} />
				{textEl}
			</>
		)
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [getFillDefForCanvas()]
	}

	override onResize: TLOnResizeHandler<TLGeoShape> = (
		shape,
		{ handle, newPoint, scaleX, scaleY, initialShape }
	) => {
		// use the w/h from props here instead of the initialBounds here,
		// since cloud shapes calculated bounds can differ from the props w/h.
		let w = initialShape.props.w * scaleX
		let h = (initialShape.props.h + initialShape.props.growY) * scaleY
		let overShrinkX = 0
		let overShrinkY = 0

		if (shape.props.text.trim()) {
			let newW = Math.max(Math.abs(w), MIN_SIZE_WITH_LABEL)
			let newH = Math.max(Math.abs(h), MIN_SIZE_WITH_LABEL)

			if (newW < MIN_SIZE_WITH_LABEL && newH === MIN_SIZE_WITH_LABEL) {
				newW = MIN_SIZE_WITH_LABEL
			}

			if (newW === MIN_SIZE_WITH_LABEL && newH < MIN_SIZE_WITH_LABEL) {
				newH = MIN_SIZE_WITH_LABEL
			}

			const labelSize = getLabelSize(this.editor, {
				...shape,
				props: {
					...shape.props,
					w: newW,
					h: newH,
				},
			})

			const nextW = Math.max(Math.abs(w), labelSize.w) * Math.sign(w)
			const nextH = Math.max(Math.abs(h), labelSize.h) * Math.sign(h)
			overShrinkX = Math.abs(nextW) - Math.abs(w)
			overShrinkY = Math.abs(nextH) - Math.abs(h)

			w = nextW
			h = nextH
		}

		const offset = new Vec(0, 0)

		// x offsets

		if (scaleX < 0) {
			offset.x += w
		}

		if (handle === 'left' || handle === 'top_left' || handle === 'bottom_left') {
			offset.x += scaleX < 0 ? overShrinkX : -overShrinkX
		}

		// y offsets

		if (scaleY < 0) {
			offset.y += h
		}

		if (handle === 'top' || handle === 'top_left' || handle === 'top_right') {
			offset.y += scaleY < 0 ? overShrinkY : -overShrinkY
		}

		const { x, y } = offset.rot(shape.rotation).add(newPoint)

		return {
			x,
			y,
			props: {
				w: Math.max(Math.abs(w), 1),
				h: Math.max(Math.abs(h), 1),
				growY: 0,
			},
		}
	}

	override onBeforeCreate = (shape: TLGeoShape) => {
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

		const prevHeight = shape.props.h
		const nextHeight = getLabelSize(this.editor, shape).h

		let growY: number | null = null

		if (nextHeight > prevHeight) {
			growY = nextHeight - prevHeight
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
					growY,
				},
			}
		}
	}

	override onBeforeUpdate = (prev: TLGeoShape, next: TLGeoShape) => {
		const prevText = prev.props.text
		const nextText = next.props.text

		if (
			prevText === nextText &&
			prev.props.font === next.props.font &&
			prev.props.size === next.props.size
		) {
			return
		}

		if (prevText && !nextText) {
			return {
				...next,
				props: {
					...next.props,
					growY: 0,
				},
			}
		}

		const prevWidth = prev.props.w
		const prevHeight = prev.props.h
		const nextSize = getLabelSize(this.editor, next)
		const nextWidth = nextSize.w
		const nextHeight = nextSize.h

		// When entering the first character in a label (not pasting in multiple characters...)
		if (!prevText && nextText && nextText.length === 1) {
			let w = Math.max(prevWidth, nextWidth)
			let h = Math.max(prevHeight, nextHeight)

			// If both the width and height were less than the minimum size, make the shape square
			if (prev.props.w < MIN_SIZE_WITH_LABEL && prev.props.h < MIN_SIZE_WITH_LABEL) {
				w = Math.max(w, MIN_SIZE_WITH_LABEL)
				h = Math.max(h, MIN_SIZE_WITH_LABEL)
				w = Math.max(w, h)
				h = Math.max(w, h)
			}

			// Don't set a growY—at least, not until we've implemented a growX property
			return {
				...next,
				props: {
					...next.props,
					w,
					h,
					growY: 0,
				},
			}
		}

		let growY: number | null = null

		if (nextHeight > prevHeight) {
			growY = nextHeight - prevHeight
		} else {
			if (prev.props.growY) {
				growY = 0
			}
		}

		if (growY !== null) {
			return {
				...next,
				props: {
					...next.props,
					growY,
					w: Math.max(next.props.w, nextWidth),
				},
			}
		}

		if (nextWidth > prev.props.w) {
			return {
				...next,
				props: {
					...next.props,
					w: nextWidth,
				},
			}
		}
	}

	override onDoubleClick = (shape: TLGeoShape) => {
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
}

function getLabelSize(editor: Editor, shape: TLGeoShape) {
	const text = shape.props.text

	if (!text) {
		return { w: 0, h: 0 }
	}

	const minSize = editor.textMeasure.measureText('w', {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[shape.props.font],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		maxWidth: 100,
	})

	// TODO: Can I get these from somewhere?
	const sizes = {
		s: 2,
		m: 3.5,
		l: 5,
		xl: 10,
	}

	const size = editor.textMeasure.measureText(text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[shape.props.font],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		minWidth: minSize.w,
		maxWidth: Math.max(
			// Guard because a DOM nodes can't be less 0
			0,
			// A 'w' width that we're setting as the min-width
			Math.ceil(minSize.w + sizes[shape.props.size]),
			// The actual text size
			Math.ceil(shape.props.w - LABEL_PADDING * 2)
		),
	})

	return {
		w: size.w + LABEL_PADDING * 2,
		h: size.h + LABEL_PADDING * 2,
	}
}
