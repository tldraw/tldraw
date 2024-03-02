import {
	Editor,
	Group2d,
	TLDefaultColorTheme,
	TLGeoShape,
	Vec,
	canonicalizeRotation,
	perimeterOfEllipse,
} from '@tldraw/editor'
import { getShapeFillSvgString, getSvgStringWithShapeFill } from '../shared/ShapeFill'
import { STROKE_SIZES } from '../shared/default-shape-constants'
import { getPerfectDashProps } from '../shared/getPerfectDashProps'
import { getRoundedInkyPolygonPath, getRoundedPolygonPoints } from '../shared/polygon-helpers'
import { cloudSvgPath, getCloudArcs, inkyCloudSvgPath } from './cloud-helpers'
import { getOvalIndicatorPath } from './components/SolidStyleOval'
import { getLines } from './lines'
import { getOvalPerimeter, getOvalSolidPath } from './oval-helpers'

/**
 * Get the svg string for an ellipse shape.
 *
 * @param shape The ellipse shape to get the svg string for.
 * @param theme The theme to use for the svg string.
 *
 * @returns The svg string for the ellipse shape.
 */
export function getEllipseSvg(shape: TLGeoShape, theme: TLDefaultColorTheme) {
	const { w, h, dash, size, fill, color } = shape.props
	const sw = STROKE_SIZES[size]
	switch (dash) {
		case 'draw':
		case 'solid': {
			const cx = w / 2
			const cy = h / 2
			const rx = Math.max(0, cx)
			const ry = Math.max(0, cy)

			const d = `M${cx - rx},${cy}a${rx},${ry},0,1,1,${rx * 2},0a${rx},${ry},0,1,1,-${rx * 2},0`

			const strokeString = `<path d="${d}" stroke="${theme[color].solid}" stroke-width="${sw}" fill="none" />`
			const fillString = getShapeFillSvgString({
				d,
				fill,
				color,
				theme,
			})

			return getSvgStringWithShapeFill(strokeString, fillString)
		}
		case 'dotted':
		case 'dashed': {
			const cx = w / 2
			const cy = h / 2
			const rx = Math.max(0, cx - sw / 2)
			const ry = Math.max(0, cy - sw / 2)

			const perimeter = perimeterOfEllipse(rx, ry)

			const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
				perimeter < 64 ? perimeter * 2 : perimeter,
				sw,
				{
					style: dash,
					snap: 4,
					closed: true,
				}
			)

			const d = `M${cx - rx},${cy}a${rx},${ry},0,1,1,${rx * 2},0a${rx},${ry},0,1,1,-${rx * 2},0`
			const strokeString = `<path d="${d}" stroke-width="${sw}" width="${w}" height="${h}" fill="none" stroke="${theme[color].solid}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" />`
			const fillString = getShapeFillSvgString({
				d,
				fill,
				color,
				theme,
			})

			return getSvgStringWithShapeFill(strokeString, fillString)
		}
	}
}

/**
 * Get the svg string for an oval shape.
 *
 * @param shape The oval shape to get the svg string for.
 * @param theme The theme to use for the svg string.
 *
 * @returns The svg string for the oval shape.
 */
export function getOvalSvg(shape: TLGeoShape, theme: TLDefaultColorTheme) {
	const { w, h, dash, size, fill, color } = shape.props
	const sw = STROKE_SIZES[size]

	switch (dash) {
		case 'draw':
		case 'solid': {
			const d = getOvalIndicatorPath(w, h)
			const strokeString = `<path d="${d}" stroke="${theme[color].solid}" stroke-width="${sw}" fill="none" />`
			const fillString = getShapeFillSvgString({
				d,
				fill,
				color,
				theme,
			})

			return getSvgStringWithShapeFill(strokeString, fillString)
		}
		case 'dashed':
		case 'dotted': {
			const d = getOvalSolidPath(w, h)
			const perimeter = getOvalPerimeter(w, h)

			const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
				perimeter < 64 ? perimeter * 2 : perimeter,
				sw,
				{
					style: dash,
					snap: 4,
					closed: true,
				}
			)

			const strokeString = `<path d="${d}" stroke-width="${sw}" width="${w}" height="${h}" fill="none" stroke="${theme[color].solid}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" />`
			const fillstring = getShapeFillSvgString({
				d,
				fill,
				color,
				theme,
			})

			return getSvgStringWithShapeFill(strokeString, fillstring)
		}
	}
}

/**
 * Get the svg string for a cloud shape.
 *
 * @param shape The cloud shape to get the svg string for.
 * @param theme The theme to use for the svg string.
 *
 * @returns The svg string for the cloud shape.
 */
export function getCloudSvg(shape: TLGeoShape, theme: TLDefaultColorTheme) {
	const { id } = shape
	const { w, h, dash, size, fill, color } = shape.props
	const sw = STROKE_SIZES[size]

	switch (dash) {
		case 'dashed':
		case 'dotted': {
			const innerPath = cloudSvgPath(w, h, id, size)
			const arcs = getCloudArcs(w, h, id, size)

			const paths: string[] = []

			for (const { leftPoint, rightPoint, center, radius } of arcs) {
				const arcLength = center
					? radius *
						canonicalizeRotation(
							canonicalizeRotation(Vec.Angle(center, rightPoint)) -
								canonicalizeRotation(Vec.Angle(center, leftPoint))
						)
					: Vec.Dist(leftPoint, rightPoint)

				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(arcLength, sw, {
					style: dash,
					start: 'outset',
					end: 'outset',
				})

				const d = center
					? `M${leftPoint.x},${leftPoint.y}A${radius},${radius},0,0,1,${rightPoint.x},${rightPoint.y}`
					: `M${leftPoint.x},${leftPoint.y}L${rightPoint.x},${rightPoint.y}`
				paths.push(
					`<path d="${d}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" />`
				)
			}

			const strokeString = `<g stroke-width="${sw}" stroke="${theme[color].solid}" fill="none">${paths.join('')}</g>`
			const fillString = getShapeFillSvgString({
				d: innerPath,
				fill,
				color,
				theme,
			})

			return getSvgStringWithShapeFill(strokeString, fillString)
		}
		default: {
			const d = dash === 'draw' ? inkyCloudSvgPath(w, h, id, size) : cloudSvgPath(w, h, id, size)

			const strokeString = `<path d="${d}" stroke="${theme[color].solid}" stroke-width="${sw}" fill="none" />`
			const fillString = getShapeFillSvgString({
				d: d,
				fill,
				color,
				theme,
			})

			return getSvgStringWithShapeFill(strokeString, fillString)
		}
	}
}

export function getPolygonSvg(editor: Editor, shape: TLGeoShape, theme: TLDefaultColorTheme) {
	const { id } = shape
	const { dash, size, fill, color } = shape.props
	const sw = STROKE_SIZES[size]

	const geometry = editor.getShapeGeometry(shape)
	const outline = geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices
	const lines = getLines(shape.props, sw)

	switch (dash) {
		case 'draw': {
			const polygonPoints = getRoundedPolygonPoints(id, outline, sw / 3, sw * 2, 2)

			let strokePathData = getRoundedInkyPolygonPath(polygonPoints)

			// Extra lines, like the x in xbox
			if (lines) {
				for (const [A, B] of lines) {
					strokePathData += `M${A.x},${A.y}L${B.x},${B.y}`
				}
			}

			const strokeString = `<path d="${strokePathData}" stroke="${theme[color].solid}" stroke-width="${sw}" fill="none" />`

			const innerPolygonPoints = getRoundedPolygonPoints(id, outline, 0, sw * 2, 1)
			const innerPathData = getRoundedInkyPolygonPath(innerPolygonPoints)
			const fillString = getShapeFillSvgString({
				d: innerPathData,
				fill,
				color,
				theme,
			})

			return getSvgStringWithShapeFill(strokeString, fillString)
		}
		case 'solid': {
			const d = 'M' + outline[0] + 'L' + outline.slice(1) + 'Z'

			let strokePathData = d

			if (lines) {
				for (const [A, B] of lines) {
					strokePathData += `M${A.x},${A.y}L${B.x},${B.y}`
				}
			}

			const strokeString = `<path d="${strokePathData}" stroke="${theme[color].solid}" stroke-width="${sw}" fill="none" />`
			const fillString = getShapeFillSvgString({
				d,
				fill,
				color,
				theme,
			})

			return getSvgStringWithShapeFill(strokeString, fillString)
		}
		case 'dotted':
		case 'dashed': {
			const lineStrings: string[] = []

			Array.from(Array(outline.length)).forEach((_, i) => {
				const A = outline[i]
				const B = outline[(i + 1) % outline.length]
				const dist = Vec.Dist(A, B)
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(dist, sw, {
					style: dash,
				})
				lineStrings.push(
					`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" />`
				)
			})

			// extra lines, like the X in an xbox
			if (lines) {
				for (const [A, B] of lines) {
					const dist = Vec.Dist(A, B)
					const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(dist, sw, {
						style: dash,
						start: 'skip',
						end: 'skip',
						snap: dash === 'dotted' ? 4 : 2,
					})
					lineStrings.push(
						`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" />`
					)
				}
			}

			const strokeString = `<g stroke-width="${sw}" stroke="${theme[color].solid}" fill="none">${lineStrings.join('')}</g>`
			const fillString = getShapeFillSvgString({
				d: 'M' + outline[0] + 'L' + outline.slice(1) + 'Z',
				fill,
				color,
				theme,
			})

			return getSvgStringWithShapeFill(strokeString, fillString)
		}
	}
}
