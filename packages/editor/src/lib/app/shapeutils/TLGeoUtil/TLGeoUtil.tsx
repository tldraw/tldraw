/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box2d,
	getPolygonVertices,
	getRoundedInkyPolygonPath,
	getRoundedPolygonPoints,
	linesIntersect,
	PI,
	PI2,
	pointInPolygon,
	TAU,
	Vec2d,
	VecLike,
} from '@tldraw/primitives'
import {
	geoShapeMigrations,
	geoShapeTypeValidator,
	TLDashType,
	TLGeoShape,
	TLGeoShapeProps,
} from '@tldraw/tlschema'
import { SVGContainer } from '../../../components/SVGContainer'
import { defineShape } from '../../../config/TLShapeDefinition'
import { FONT_FAMILIES, LABEL_FONT_SIZES, TEXT_PROPS } from '../../../constants'
import { App } from '../../App'
import { getTextSvgElement } from '../shared/getTextSvgElement'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { TextLabel } from '../shared/TextLabel'
import { TLExportColors } from '../shared/TLExportColors'
import { useForceSolid } from '../shared/useForceSolid'
import { TLBoxUtil } from '../TLBoxUtil'
import { OnEditEndHandler, OnResizeHandler } from '../TLShapeUtil'
import { DashStyleEllipse, DashStyleEllipseSvg } from './components/DashStyleEllipse'
import { DashStyleOval, DashStyleOvalSvg } from './components/DashStyleOval'
import { DashStylePolygon, DashStylePolygonSvg } from './components/DashStylePolygon'
import { DrawStyleEllipseSvg, getEllipseIndicatorPath } from './components/DrawStyleEllipse'
import { DrawStylePolygon, DrawStylePolygonSvg } from './components/DrawStylePolygon'
import { SolidStyleEllipse, SolidStyleEllipseSvg } from './components/SolidStyleEllipse'
import {
	getOvalIndicatorPath,
	SolidStyleOval,
	SolidStyleOvalSvg,
} from './components/SolidStyleOval'
import { SolidStylePolygon, SolidStylePolygonSvg } from './components/SolidStylePolygon'

const LABEL_PADDING = 16
const MIN_SIZE_WITH_LABEL = 17 * 3

/** @public */
export class TLGeoUtil extends TLBoxUtil<TLGeoShape> {
	static type = 'geo'

	canEdit = () => true

	override defaultProps(): TLGeoShape['props'] {
		return {
			w: 100,
			h: 100,
			geo: 'rectangle',
			color: 'black',
			labelColor: 'black',
			fill: 'none',
			dash: 'draw',
			size: 'm',
			opacity: '1',
			font: 'draw',
			text: '',
			align: 'middle',
			growY: 0,
			url: '',
		}
	}

	hitTestLineSegment(shape: TLGeoShape, A: VecLike, B: VecLike): boolean {
		const outline = this.outline(shape)

		// Check the outline
		for (let i = 0; i < outline.length; i++) {
			const C = outline[i]
			const D = outline[(i + 1) % outline.length]
			if (linesIntersect(A, B, C, D)) return true
		}

		// Also check lines, if any
		const lines = getLines(shape.props, 0)
		if (lines !== undefined) {
			for (const [C, D] of lines) {
				if (linesIntersect(A, B, C, D)) return true
			}
		}

		return false
	}

	hitTestPoint(shape: TLGeoShape, point: VecLike): boolean {
		const outline = this.outline(shape)

		if (shape.props.fill === 'none') {
			const zoomLevel = this.app.zoomLevel
			const offsetDist = this.app.getStrokeWidth(shape.props.size) / zoomLevel
			// Check the outline
			for (let i = 0; i < outline.length; i++) {
				const C = outline[i]
				const D = outline[(i + 1) % outline.length]
				if (Vec2d.DistanceToLineSegment(C, D, point) < offsetDist) return true
			}

			// Also check lines, if any
			const lines = getLines(shape.props, 1)
			if (lines !== undefined) {
				for (const [C, D] of lines) {
					if (Vec2d.DistanceToLineSegment(C, D, point) < offsetDist) return true
				}
			}

			return false
		}

		return pointInPolygon(point, outline)
	}

	getBounds(shape: TLGeoShape) {
		return new Box2d(0, 0, shape.props.w, shape.props.h + shape.props.growY)
	}

	getCenter(shape: TLGeoShape) {
		return new Vec2d(shape.props.w / 2, (shape.props.h + shape.props.growY) / 2)
	}

	getOutline(shape: TLGeoShape) {
		const w = Math.max(1, shape.props.w)
		const h = Math.max(1, shape.props.h + shape.props.growY)
		const cx = w / 2
		const cy = h / 2

		switch (shape.props.geo) {
			case 'triangle': {
				return [new Vec2d(cx, 0), new Vec2d(w, h), new Vec2d(0, h)]
			}
			case 'diamond': {
				return [new Vec2d(cx, 0), new Vec2d(w, cy), new Vec2d(cx, h), new Vec2d(0, cy)]
			}
			case 'pentagon': {
				return getPolygonVertices(w, h, 5)
			}
			case 'hexagon': {
				return getPolygonVertices(w, h, 6)
			}
			case 'octagon': {
				return getPolygonVertices(w, h, 8)
			}
			case 'ellipse': {
				// Perimeter of the ellipse

				const q = Math.pow(cx - cy, 2) / Math.pow(cx + cy, 2)
				const p = PI * (cx + cy) * (1 + (3 * q) / (10 + Math.sqrt(4 - 3 * q)))

				// Number of points
				let len = Math.max(4, Math.ceil(p / 10))

				// Round length to nearest multiple of 4
				// In some cases, this stops the outline overlapping with the indicator
				// (it doesn't prevent all cases though, eg: when the shape is on the edge of a group)
				len = Math.ceil(len / 4) * 4

				// Size of step
				const step = PI2 / len

				const a = Math.cos(step)
				const b = Math.sin(step)

				let sin = 0
				let cos = 1
				let ts = 0
				let tc = 1

				const points: Vec2d[] = Array(len)

				for (let i = 0; i < len; i++) {
					points[i] = new Vec2d(cx + cx * cos, cy + cy * sin)
					ts = b * cos + a * sin
					tc = a * cos - b * sin
					sin = ts
					cos = tc
				}

				return points
			}
			case 'oval': {
				const len = 10
				const points: Vec2d[] = Array(len * 2)

				if (h > w) {
					for (let i = 0; i < len; i++) {
						const t1 = -PI + (PI * i) / (len - 2)
						const t2 = (PI * i) / (len - 2)
						points[i] = new Vec2d(cx + cx * Math.cos(t1), cx + cx * Math.sin(t1))
						points[i + len] = new Vec2d(cx + cx * Math.cos(t2), h - cx + cx * Math.sin(t2))
					}
				} else {
					for (let i = 0; i < len; i++) {
						const t1 = -TAU + (PI * i) / (len - 2)
						const t2 = TAU + (PI * -i) / (len - 2)
						points[i] = new Vec2d(w - cy + cy * Math.cos(t1), h - cy + cy * Math.sin(t1))
						points[i + len] = new Vec2d(cy - cy * Math.cos(t2), h - cy + cy * Math.sin(t2))
					}
				}

				return points
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

				return Array.from(Array(sides * 2)).map((_, i) => {
					const theta = -TAU + i * step
					return new Vec2d(
						cx + (i % 2 ? ix : ox) * Math.cos(theta),
						cy + (i % 2 ? iy : oy) * Math.sin(theta)
					)
				})
			}
			case 'rhombus': {
				const offset = Math.min(w * 0.38, h * 0.38)
				return [new Vec2d(offset, 0), new Vec2d(w, 0), new Vec2d(w - offset, h), new Vec2d(0, h)]
			}
			case 'rhombus-2': {
				const offset = Math.min(w * 0.38, h * 0.38)
				return [new Vec2d(0, 0), new Vec2d(w - offset, 0), new Vec2d(w, h), new Vec2d(offset, h)]
			}
			case 'trapezoid': {
				const offset = Math.min(w * 0.38, h * 0.38)
				return [new Vec2d(offset, 0), new Vec2d(w - offset, 0), new Vec2d(w, h), new Vec2d(0, h)]
			}
			case 'arrow-right': {
				const ox = Math.min(w, h) * 0.38
				const oy = h * 0.16
				return [
					new Vec2d(0, oy),
					new Vec2d(w - ox, oy),
					new Vec2d(w - ox, 0),
					new Vec2d(w, h / 2),
					new Vec2d(w - ox, h),
					new Vec2d(w - ox, h - oy),
					new Vec2d(0, h - oy),
				]
			}
			case 'arrow-left': {
				const ox = Math.min(w, h) * 0.38
				const oy = h * 0.16
				return [
					new Vec2d(ox, 0),
					new Vec2d(ox, oy),
					new Vec2d(w, oy),
					new Vec2d(w, h - oy),
					new Vec2d(ox, h - oy),
					new Vec2d(ox, h),
					new Vec2d(0, h / 2),
				]
			}
			case 'arrow-up': {
				const ox = w * 0.16
				const oy = Math.min(w, h) * 0.38
				return [
					new Vec2d(w / 2, 0),
					new Vec2d(w, oy),
					new Vec2d(w - ox, oy),
					new Vec2d(w - ox, h),
					new Vec2d(ox, h),
					new Vec2d(ox, oy),
					new Vec2d(0, oy),
				]
			}
			case 'arrow-down': {
				const ox = w * 0.16
				const oy = Math.min(w, h) * 0.38
				return [
					new Vec2d(ox, 0),
					new Vec2d(w - ox, 0),
					new Vec2d(w - ox, h - oy),
					new Vec2d(w, h - oy),
					new Vec2d(w / 2, h),
					new Vec2d(0, h - oy),
					new Vec2d(ox, h - oy),
				]
			}
			case 'check-box':
			case 'x-box':
			case 'rectangle': {
				return [new Vec2d(0, 0), new Vec2d(w, 0), new Vec2d(w, h), new Vec2d(0, h)]
			}
		}
	}

	onEditEnd: OnEditEndHandler<TLGeoShape> = (shape) => {
		const {
			id,
			type,
			props: { text },
		} = shape

		if (text.trimEnd() !== shape.props.text) {
			this.app.updateShapes([
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

	render(shape: TLGeoShape) {
		const { id, type, props } = shape

		const forceSolid = useForceSolid()
		const strokeWidth = this.app.getStrokeWidth(props.size)

		const { w, color, labelColor, fill, dash, growY, font, align, size, text } = props

		const getShape = () => {
			const h = props.h + growY

			switch (props.geo) {
				case 'ellipse': {
					if (dash === 'solid' || (dash === 'draw' && forceSolid)) {
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
								dash={dash === 'dashed' ? dash : size === 's' && forceSolid ? 'dashed' : dash}
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
					if (dash === 'solid' || (dash === 'draw' && forceSolid)) {
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
								dash={dash === 'dashed' ? dash : size === 's' && forceSolid ? 'dashed' : dash}
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
					const outline = this.outline(shape)
					const lines = getLines(shape.props, strokeWidth)

					if (dash === 'solid' || (dash === 'draw' && forceSolid)) {
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
								dash={dash === 'dashed' ? dash : size === 's' && forceSolid ? 'dashed' : dash}
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
					text={text}
					labelColor={this.app.getCssColor(labelColor)}
					wrap
				/>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.app.zoomLevel} />
				)}
			</>
		)
	}

	indicator(shape: TLGeoShape) {
		const { id, props } = shape
		const { w, h, growY, size } = props

		const forceSolid = useForceSolid()
		const strokeWidth = this.app.getStrokeWidth(size)

		switch (props.geo) {
			case 'ellipse': {
				if (props.dash === 'draw' && !forceSolid) {
					return <path d={getEllipseIndicatorPath(id, w, h + growY, strokeWidth)} />
				}

				return <ellipse cx={w / 2} cy={(h + growY) / 2} rx={w / 2} ry={(h + growY) / 2} />
			}
			case 'oval': {
				return <path d={getOvalIndicatorPath(w, h + growY)} />
			}

			default: {
				const outline = this.outline(shape)
				let path: string

				if (props.dash === 'draw' && !forceSolid) {
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

	toSvg(shape: TLGeoShape, font: string, colors: TLExportColors) {
		const { id, props } = shape
		const strokeWidth = this.app.getStrokeWidth(props.size)

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
							colors,
						})
						break

					case 'solid':
						svgElm = SolidStyleEllipseSvg({
							strokeWidth,
							w: props.w,
							h: props.h,
							color: props.color,
							fill: props.fill,
							colors,
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
							colors,
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
							colors,
						})
						break

					case 'solid':
						svgElm = SolidStyleOvalSvg({
							strokeWidth,
							w: props.w,
							h: props.h,
							color: props.color,
							fill: props.fill,
							colors,
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
							colors,
						})
				}
				break
			}
			default: {
				const outline = this.outline(shape)
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
							colors,
						})
						break

					case 'solid':
						svgElm = SolidStylePolygonSvg({
							fill: props.fill,
							color: props.color,
							strokeWidth,
							outline,
							lines,
							colors,
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
							colors,
						})
						break
				}
				break
			}
		}

		if (props.text) {
			const bounds = this.bounds(shape)

			const opts = {
				fontSize: LABEL_FONT_SIZES[shape.props.size],
				fontFamily: font,
				textAlign: shape.props.align,
				padding: 16,
				lineHeight: TEXT_PROPS.lineHeight,
				fontStyle: 'normal',
				fontWeight: 'normal',
				width: Math.ceil(bounds.width),
				height: Math.ceil(bounds.height),
			}

			const lines = this.app.textMeasure.getTextLines({
				text: props.text,
				wrap: true,
				...opts,
			})

			const groupEl = document.createElementNS('http://www.w3.org/2000/svg', 'g')

			const labelSize = getLabelSize(this.app, shape)

			const textBgEl = getTextSvgElement(this.app, {
				...opts,
				lines,
				strokeWidth: 2,
				stroke: colors.background,
				fill: colors.background,
				width: labelSize.w,
			})

			// yuck, include padding as magic number
			textBgEl.setAttribute('transform', `translate(${(bounds.width - labelSize.w) / 2}, 0)`)

			const textElm = textBgEl.cloneNode(true) as SVGTextElement
			textElm.setAttribute('fill', colors.fill[shape.props.labelColor])
			textElm.setAttribute('stroke', 'none')

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

	onResize: OnResizeHandler<TLGeoShape> = (
		shape,
		{ initialBounds, handle, newPoint, scaleX, scaleY }
	) => {
		let w = initialBounds.width * scaleX
		let h = initialBounds.height * scaleY
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

			const labelSize = getLabelSize(this.app, {
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

	onBeforeCreate = (shape: TLGeoShape) => {
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
		const nextHeight = getLabelSize(this.app, shape).h

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

	onBeforeUpdate = (prev: TLGeoShape, next: TLGeoShape) => {
		const prevText = prev.props.text.trimEnd()
		const nextText = next.props.text.trimEnd()

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
		const nextSize = getLabelSize(this.app, next)
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

	onDoubleClick = (shape: TLGeoShape) => {
		// Little easter egg: double-clicking a rectangle / checkbox while
		// holding alt will toggle between check-box and rectangle
		if (this.app.inputs.altKey) {
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

function getLabelSize(app: App, shape: TLGeoShape) {
	const text = shape.props.text.trimEnd()

	if (!text) {
		return { w: 0, h: 0 }
	}

	const minSize = app.textMeasure.measureText({
		...TEXT_PROPS,
		text: 'w',
		fontFamily: FONT_FAMILIES[shape.props.font],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		width: 'fit-content',
		maxWidth: '100px',
	})

	// TODO: Can I get these from somewhere?
	const sizes = {
		s: 2,
		m: 3.5,
		l: 5,
		xl: 10,
	}

	const size = app.textMeasure.measureText({
		...TEXT_PROPS,
		text: text,
		fontFamily: FONT_FAMILIES[shape.props.font],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		width: 'fit-content',
		minWidth: minSize.w + 'px',
		maxWidth:
			Math.max(
				// Guard because a DOM nodes can't be less 0
				0,
				// A 'w' width that we're setting as the min-width
				Math.ceil(minSize.w + sizes[shape.props.size]),
				// The actual text size
				Math.ceil(shape.props.w - LABEL_PADDING * 2)
			) + 'px',
	})

	return {
		w: size.w + LABEL_PADDING * 2,
		h: size.h + LABEL_PADDING * 2,
	}
}

function getLines(props: TLGeoShapeProps, sw: number) {
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

function getXBoxLines(w: number, h: number, sw: number, dash: TLDashType) {
	const inset = dash === 'draw' ? 0.62 : 0

	if (dash === 'dashed') {
		return [
			[new Vec2d(0, 0), new Vec2d(w / 2, h / 2)],
			[new Vec2d(w, h), new Vec2d(w / 2, h / 2)],
			[new Vec2d(0, h), new Vec2d(w / 2, h / 2)],
			[new Vec2d(w, 0), new Vec2d(w / 2, h / 2)],
		]
	}

	return [
		[new Vec2d(sw * inset, sw * inset), new Vec2d(w - sw * inset, h - sw * inset)],
		[new Vec2d(sw * inset, h - sw * inset), new Vec2d(w - sw * inset, sw * inset)],
	]
}

function getCheckBoxLines(w: number, h: number) {
	const size = Math.min(w, h) * 0.82
	const ox = (w - size) / 2
	const oy = (h - size) / 2
	return [
		[new Vec2d(ox + size * 0.25, oy + size * 0.52), new Vec2d(ox + size * 0.45, oy + size * 0.82)],
		[new Vec2d(ox + size * 0.45, oy + size * 0.82), new Vec2d(ox + size * 0.82, oy + size * 0.22)],
	]
}

/** @public */
export const TLGeoShapeDef = defineShape<TLGeoShape, TLGeoUtil>({
	type: 'geo',
	getShapeUtil: () => TLGeoUtil,
	validator: geoShapeTypeValidator,
	migrations: geoShapeMigrations,
})
