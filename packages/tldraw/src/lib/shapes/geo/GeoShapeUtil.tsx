import {
	BaseBoxShapeUtil,
	DefaultFontFamilies,
	Editor,
	Ellipse2d,
	Geometry2d,
	Group2d,
	PI2,
	Polygon2d,
	Polyline2d,
	Rectangle2d,
	SVGContainer,
	Stadium2d,
	SvgExportContext,
	TAU,
	TLDefaultDashStyle,
	TLGeoShape,
	TLOnEditEndHandler,
	TLOnResizeHandler,
	TLShapeUtilCanvasSvgDef,
	Vec2d,
	geoShapeMigrations,
	geoShapeProps,
	getDefaultColorTheme,
	getPolygonVertices,
} from '@tldraw/editor'

import { HyperlinkButton } from '../shared/HyperlinkButton'
import { TextLabel } from '../shared/TextLabel'
import {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	STROKE_SIZES,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import {
	getFillDefForCanvas,
	getFillDefForExport,
	getFontDefForExport,
} from '../shared/defaultStyleDefs'
import { getTextLabelSvgElement } from '../shared/getTextLabelSvgElement'
import { getRoundedInkyPolygonPath, getRoundedPolygonPoints } from '../shared/polygon-helpers'
import { cloudOutline, cloudSvgPath } from './cloudOutline'
import { DashStyleCloud, DashStyleCloudSvg } from './components/DashStyleCloud'
import { DashStyleEllipse, DashStyleEllipseSvg } from './components/DashStyleEllipse'
import { DashStyleOval, DashStyleOvalSvg } from './components/DashStyleOval'
import { DashStylePolygon, DashStylePolygonSvg } from './components/DashStylePolygon'
import { DrawStyleCloud, DrawStyleCloudSvg } from './components/DrawStyleCloud'
import { DrawStyleEllipseSvg, getEllipseIndicatorPath } from './components/DrawStyleEllipse'
import { DrawStylePolygon, DrawStylePolygonSvg } from './components/DrawStylePolygon'
import { SolidStyleCloud, SolidStyleCloudSvg } from './components/SolidStyleCloud'
import { SolidStyleEllipse, SolidStyleEllipseSvg } from './components/SolidStyleEllipse'
import {
	SolidStyleOval,
	SolidStyleOvalSvg,
	getOvalIndicatorPath,
} from './components/SolidStyleOval'
import { SolidStylePolygon, SolidStylePolygonSvg } from './components/SolidStylePolygon'

const LABEL_PADDING = 16
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

	override getGeometry(shape: TLGeoShape): Geometry2d {
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
					points: [new Vec2d(cx, 0), new Vec2d(w, h), new Vec2d(0, h)],
					isFilled,
				})
				break
			}
			case 'diamond': {
				body = new Polygon2d({
					points: [new Vec2d(cx, 0), new Vec2d(w, cy), new Vec2d(cx, h), new Vec2d(0, cy)],
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
				const maxX = (Math.cos(-TAU + rightMostIndex * step) * w) / 2
				const minX = (Math.cos(-TAU + leftMostIndex * step) * w) / 2

				const minY = (Math.sin(-TAU + topMostIndex * step) * h) / 2
				const maxY = (Math.sin(-TAU + bottomMostIndex * step) * h) / 2
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
						const theta = -TAU + i * step
						return new Vec2d(
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
					points: [
						new Vec2d(offset, 0),
						new Vec2d(w, 0),
						new Vec2d(w - offset, h),
						new Vec2d(0, h),
					],
					isFilled,
				})
				break
			}
			case 'rhombus-2': {
				const offset = Math.min(w * 0.38, h * 0.38)
				body = new Polygon2d({
					points: [
						new Vec2d(0, 0),
						new Vec2d(w - offset, 0),
						new Vec2d(w, h),
						new Vec2d(offset, h),
					],
					isFilled,
				})
				break
			}
			case 'trapezoid': {
				const offset = Math.min(w * 0.38, h * 0.38)
				body = new Polygon2d({
					points: [
						new Vec2d(offset, 0),
						new Vec2d(w - offset, 0),
						new Vec2d(w, h),
						new Vec2d(0, h),
					],
					isFilled,
				})
				break
			}
			case 'arrow-right': {
				const ox = Math.min(w, h) * 0.38
				const oy = h * 0.16
				body = new Polygon2d({
					points: [
						new Vec2d(0, oy),
						new Vec2d(w - ox, oy),
						new Vec2d(w - ox, 0),
						new Vec2d(w, h / 2),
						new Vec2d(w - ox, h),
						new Vec2d(w - ox, h - oy),
						new Vec2d(0, h - oy),
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
						new Vec2d(ox, 0),
						new Vec2d(ox, oy),
						new Vec2d(w, oy),
						new Vec2d(w, h - oy),
						new Vec2d(ox, h - oy),
						new Vec2d(ox, h),
						new Vec2d(0, h / 2),
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
						new Vec2d(w / 2, 0),
						new Vec2d(w, oy),
						new Vec2d(w - ox, oy),
						new Vec2d(w - ox, h),
						new Vec2d(ox, h),
						new Vec2d(ox, oy),
						new Vec2d(0, oy),
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
						new Vec2d(ox, 0),
						new Vec2d(w - ox, 0),
						new Vec2d(w - ox, h - oy),
						new Vec2d(w, h - oy),
						new Vec2d(w / 2, h),
						new Vec2d(0, h - oy),
						new Vec2d(ox, h - oy),
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
					isSnappable: true,
				})
				break
			}
		}

		const labelSize = getLabelSize(this.editor, shape)
		const labelWidth = Math.min(w, Math.max(labelSize.w, Math.min(32, Math.max(1, w - 8))))
		const labelHeight = Math.min(h, Math.max(labelSize.h, Math.min(32, Math.max(1, w - 8))))

		const lines = getLines(shape.props, strokeWidth)
		const edges = lines ? lines.map((line) => new Polyline2d({ points: line })) : []

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
					isSnappable: false,
					isLabel: true,
				}),
				...edges,
			],
			isSnappable: false,
		})
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

		const strokeWidth = STROKE_SIZES[props.size]

		const { w, color, labelColor, fill, dash, growY, font, align, verticalAlign, size, text } =
			props

		const getShape = () => {
			const h = props.h + growY

			switch (props.geo) {
				case 'cloud': {
					if (dash === 'solid') {
						return (
							<SolidStyleCloud
								color={color}
								fill={fill}
								strokeWidth={strokeWidth}
								w={w}
								h={h}
								id={id}
								size={size}
							/>
						)
					} else if (dash === 'dashed' || dash === 'dotted') {
						return (
							<DashStyleCloud
								color={color}
								fill={fill}
								strokeWidth={strokeWidth}
								w={w}
								h={h}
								id={id}
								size={size}
								dash={dash}
							/>
						)
					} else if (dash === 'draw') {
						return (
							<DrawStyleCloud
								color={color}
								fill={fill}
								strokeWidth={strokeWidth}
								w={w}
								h={h}
								id={id}
								size={size}
							/>
						)
					}

					break
				}
				case 'ellipse': {
					if (dash === 'solid') {
						return (
							<SolidStyleEllipse strokeWidth={strokeWidth} w={w} h={h} color={color} fill={fill} />
						)
					} else if (dash === 'dashed' || dash === 'dotted') {
						return (
							<DashStyleEllipse
								id={id}
								strokeWidth={strokeWidth}
								w={w}
								h={h}
								dash={dash}
								color={color}
								fill={fill}
							/>
						)
					} else if (dash === 'draw') {
						return (
							<SolidStyleEllipse strokeWidth={strokeWidth} w={w} h={h} color={color} fill={fill} />
						)
					}
					break
				}
				case 'oval': {
					if (dash === 'solid') {
						return (
							<SolidStyleOval strokeWidth={strokeWidth} w={w} h={h} color={color} fill={fill} />
						)
					} else if (dash === 'dashed' || dash === 'dotted') {
						return (
							<DashStyleOval
								id={id}
								strokeWidth={strokeWidth}
								w={w}
								h={h}
								dash={dash}
								color={color}
								fill={fill}
							/>
						)
					} else if (dash === 'draw') {
						return (
							<SolidStyleOval strokeWidth={strokeWidth} w={w} h={h} color={color} fill={fill} />
						)
					}
					break
				}
				default: {
					const geometry = this.editor.getShapeGeometry(shape)
					const outline =
						geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices
					const lines = getLines(shape.props, strokeWidth)

					if (dash === 'solid') {
						return (
							<SolidStylePolygon
								fill={fill}
								color={color}
								strokeWidth={strokeWidth}
								outline={outline}
								lines={lines}
							/>
						)
					} else if (dash === 'dashed' || dash === 'dotted') {
						return (
							<DashStylePolygon
								dash={dash}
								fill={fill}
								color={color}
								strokeWidth={strokeWidth}
								outline={outline}
								lines={lines}
							/>
						)
					} else if (dash === 'draw') {
						return (
							<DrawStylePolygon
								id={id}
								fill={fill}
								color={color}
								strokeWidth={strokeWidth}
								outline={outline}
								lines={lines}
							/>
						)
					}
				}
			}
		}

		return (
			<>
				<SVGContainer id={id}>{getShape()}</SVGContainer>
				<TextLabel
					id={id}
					type={type}
					font={font}
					fill={fill}
					size={size}
					align={align}
					verticalAlign={verticalAlign}
					text={text}
					labelColor={labelColor}
					wrap
					bounds={props.geo === 'cloud' ? this.getGeometry(shape).bounds : undefined}
				/>
				{shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.zoomLevel} />
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
		const { id, props } = shape
		const strokeWidth = STROKE_SIZES[props.size]
		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.isDarkMode })
		ctx.addExportDef(getFillDefForExport(shape.props.fill, theme))

		let svgElm: SVGElement

		switch (props.geo) {
			case 'ellipse': {
				switch (props.dash) {
					case 'draw':
						svgElm = DrawStyleEllipseSvg({
							id,
							w: props.w,
							h: props.h,
							color: props.color,
							fill: props.fill,
							strokeWidth,
							theme,
						})
						break

					case 'solid':
						svgElm = SolidStyleEllipseSvg({
							strokeWidth,
							w: props.w,
							h: props.h,
							color: props.color,
							fill: props.fill,
							theme,
						})
						break

					default:
						svgElm = DashStyleEllipseSvg({
							id,
							strokeWidth,
							w: props.w,
							h: props.h,
							dash: props.dash,
							color: props.color,
							fill: props.fill,
							theme,
						})
						break
				}
				break
			}

			case 'oval': {
				switch (props.dash) {
					case 'draw':
						svgElm = DashStyleOvalSvg({
							id,
							strokeWidth,
							w: props.w,
							h: props.h,
							dash: props.dash,
							color: props.color,
							fill: props.fill,
							theme,
						})
						break

					case 'solid':
						svgElm = SolidStyleOvalSvg({
							strokeWidth,
							w: props.w,
							h: props.h,
							color: props.color,
							fill: props.fill,
							theme,
						})
						break

					default:
						svgElm = DashStyleOvalSvg({
							id,
							strokeWidth,
							w: props.w,
							h: props.h,
							dash: props.dash,
							color: props.color,
							fill: props.fill,
							theme,
						})
				}
				break
			}

			case 'cloud': {
				switch (props.dash) {
					case 'draw':
						svgElm = DrawStyleCloudSvg({
							id,
							strokeWidth,
							w: props.w,
							h: props.h,
							color: props.color,
							fill: props.fill,
							size: props.size,
							theme,
						})
						break

					case 'solid':
						svgElm = SolidStyleCloudSvg({
							strokeWidth,
							w: props.w,
							h: props.h,
							color: props.color,
							fill: props.fill,
							size: props.size,
							id,
							theme,
						})
						break

					default:
						svgElm = DashStyleCloudSvg({
							id,
							strokeWidth,
							w: props.w,
							h: props.h,
							dash: props.dash,
							color: props.color,
							fill: props.fill,
							theme,
							size: props.size,
						})
				}
				break
			}
			default: {
				const geometry = this.editor.getShapeGeometry(shape)
				const outline =
					geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices
				const lines = getLines(shape.props, strokeWidth)

				switch (props.dash) {
					case 'draw':
						svgElm = DrawStylePolygonSvg({
							id,
							fill: props.fill,
							color: props.color,
							strokeWidth,
							outline,
							lines,
							theme,
						})
						break

					case 'solid':
						svgElm = SolidStylePolygonSvg({
							fill: props.fill,
							color: props.color,
							strokeWidth,
							outline,
							lines,
							theme,
						})
						break

					default:
						svgElm = DashStylePolygonSvg({
							dash: props.dash,
							fill: props.fill,
							color: props.color,
							strokeWidth,
							outline,
							lines,
							theme,
						})
						break
				}
				break
			}
		}

		if (props.text) {
			const bounds = this.editor.getShapeGeometry(shape).bounds

			ctx.addExportDef(getFontDefForExport(shape.props.font))

			const rootTextElm = getTextLabelSvgElement({
				editor: this.editor,
				shape,
				font: DefaultFontFamilies[shape.props.font],
				bounds,
			})

			const textElm = rootTextElm.cloneNode(true) as SVGTextElement
			textElm.setAttribute('fill', theme[shape.props.labelColor].solid)
			textElm.setAttribute('stroke', 'none')

			const textBgEl = rootTextElm.cloneNode(true) as SVGTextElement
			textBgEl.setAttribute('stroke-width', '2')
			textBgEl.setAttribute('fill', theme.background)
			textBgEl.setAttribute('stroke', theme.background)

			const groupEl = document.createElementNS('http://www.w3.org/2000/svg', 'g')
			groupEl.append(textBgEl)
			groupEl.append(textElm)

			if (svgElm.nodeName === 'g') {
				svgElm.appendChild(groupEl)
				return svgElm
			} else {
				const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
				g.appendChild(svgElm)
				g.appendChild(groupEl)
				return g
			}
		}

		return svgElm
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

		const offset = new Vec2d(0, 0)

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
		minWidth: minSize.w + 'px',
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

function getLines(props: TLGeoShape['props'], sw: number) {
	switch (props.geo) {
		case 'x-box': {
			return getXBoxLines(props.w, props.h, sw, props.dash)
		}
		case 'check-box': {
			return getCheckBoxLines(props.w, props.h)
		}
		default: {
			return undefined
		}
	}
}

function getXBoxLines(w: number, h: number, sw: number, dash: TLDefaultDashStyle) {
	const inset = dash === 'draw' ? 0.62 : 0

	if (dash === 'dashed') {
		return [
			[new Vec2d(0, 0), new Vec2d(w / 2, h / 2)],
			[new Vec2d(w, h), new Vec2d(w / 2, h / 2)],
			[new Vec2d(0, h), new Vec2d(w / 2, h / 2)],
			[new Vec2d(w, 0), new Vec2d(w / 2, h / 2)],
		]
	}

	const clampX = (x: number) => Math.max(0, Math.min(w, x))
	const clampY = (y: number) => Math.max(0, Math.min(h, y))

	return [
		[
			new Vec2d(clampX(sw * inset), clampY(sw * inset)),
			new Vec2d(clampX(w - sw * inset), clampY(h - sw * inset)),
		],
		[
			new Vec2d(clampX(sw * inset), clampY(h - sw * inset)),
			new Vec2d(clampX(w - sw * inset), clampY(sw * inset)),
		],
	]
}

function getCheckBoxLines(w: number, h: number) {
	const size = Math.min(w, h) * 0.82
	const ox = (w - size) / 2
	const oy = (h - size) / 2

	const clampX = (x: number) => Math.max(0, Math.min(w, x))
	const clampY = (y: number) => Math.max(0, Math.min(h, y))

	return [
		[
			new Vec2d(clampX(ox + size * 0.25), clampY(oy + size * 0.52)),
			new Vec2d(clampX(ox + size * 0.45), clampY(oy + size * 0.82)),
		],
		[
			new Vec2d(clampX(ox + size * 0.45), clampY(oy + size * 0.82)),
			new Vec2d(clampX(ox + size * 0.82), clampY(oy + size * 0.22)),
		],
	]
}
