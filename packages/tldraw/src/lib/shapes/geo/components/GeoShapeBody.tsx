import { Group2d, TLGeoShape, Vec, canonicalizeRotation, useEditor } from '@tldraw/editor'
import { ShapeFill, useDefaultColorTheme } from '../../shared/ShapeFill'
import { STROKE_SIZES } from '../../shared/default-shape-constants'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'
import {
	getCloudArcs,
	getCloudPath,
	getDrawHeartPath,
	getHeartParts,
	getHeartPath,
	getRoundedInkyPolygonPath,
	getRoundedPolygonPoints,
	inkyCloudSvgPath,
} from '../geo-shape-helpers'
import { getLines } from '../getLines'

export function GeoShapeBody({ shape }: { shape: TLGeoShape }) {
	const editor = useEditor()
	const theme = useDefaultColorTheme()
	const { id, props } = shape
	const { w, color, fill, dash, growY, size } = props
	const strokeWidth = STROKE_SIZES[size]
	const h = props.h + growY

	switch (props.geo) {
		case 'cloud': {
			if (dash === 'solid') {
				const d = getCloudPath(w, h, id, size)
				return (
					<>
						<ShapeFill theme={theme} d={d} color={color} fill={fill} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			} else if (dash === 'draw') {
				const d = inkyCloudSvgPath(w, h, id, size)
				return (
					<>
						<ShapeFill theme={theme} d={d} color={color} fill={fill} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			} else {
				const innerPath = getCloudPath(w, h, id, size)
				const arcs = getCloudArcs(w, h, id, size)

				return (
					<>
						<ShapeFill theme={theme} d={innerPath} color={color} fill={fill} />
						<g
							strokeWidth={strokeWidth}
							stroke={theme[color].solid}
							fill="none"
							pointerEvents="all"
						>
							{arcs.map(({ leftPoint, rightPoint, center, radius }, i) => {
								const arcLength = center
									? radius *
										canonicalizeRotation(
											canonicalizeRotation(Vec.Angle(center, rightPoint)) -
												canonicalizeRotation(Vec.Angle(center, leftPoint))
										)
									: Vec.Dist(leftPoint, rightPoint)

								const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
									arcLength,
									strokeWidth,
									{
										style: dash,
										start: 'outset',
										end: 'outset',
									}
								)

								return (
									<path
										key={i}
										d={
											center
												? `M${leftPoint.x},${leftPoint.y}A${radius},${radius},0,0,1,${rightPoint.x},${rightPoint.y}`
												: `M${leftPoint.x},${leftPoint.y}L${rightPoint.x},${rightPoint.y}`
										}
										strokeDasharray={strokeDasharray}
										strokeDashoffset={strokeDashoffset}
									/>
								)
							})}
						</g>
					</>
				)
			}
		}
		case 'ellipse': {
			const geometry = editor.getShapeGeometry(shape)
			const d = geometry.getSvgPathData(true)

			if (dash === 'dashed' || dash === 'dotted') {
				const perimeter = geometry.length
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
					perimeter < 64 ? perimeter * 2 : perimeter,
					strokeWidth,
					{
						style: dash,
						snap: 4,
						closed: true,
					}
				)

				return (
					<>
						<ShapeFill theme={theme} d={d} color={color} fill={fill} />
						<path
							d={d}
							strokeWidth={strokeWidth}
							fill="none"
							stroke={theme[color].solid}
							strokeDasharray={strokeDasharray}
							strokeDashoffset={strokeDashoffset}
						/>
					</>
				)
			} else {
				const geometry = editor.getShapeGeometry(shape)
				const d = geometry.getSvgPathData(true)
				return (
					<>
						<ShapeFill theme={theme} d={d} color={color} fill={fill} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			}
		}
		case 'oval': {
			const geometry = editor.getShapeGeometry(shape)
			const d = geometry.getSvgPathData(true)
			if (dash === 'dashed' || dash === 'dotted') {
				const perimeter = geometry.getLength()
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
					perimeter < 64 ? perimeter * 2 : perimeter,
					strokeWidth,
					{
						style: dash,
						snap: 4,
						start: 'outset',
						end: 'outset',
						closed: true,
					}
				)

				return (
					<>
						<ShapeFill theme={theme} d={d} color={color} fill={fill} />
						<path
							d={d}
							strokeWidth={strokeWidth}
							fill="none"
							stroke={theme[color].solid}
							strokeDasharray={strokeDasharray}
							strokeDashoffset={strokeDashoffset}
						/>
					</>
				)
			} else {
				return (
					<>
						<ShapeFill theme={theme} d={d} color={color} fill={fill} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			}
		}
		case 'heart': {
			if (dash === 'dashed' || dash === 'dotted') {
				const d = getHeartPath(w, h)
				const curves = getHeartParts(w, h)

				return (
					<>
						<ShapeFill theme={theme} d={d} color={color} fill={fill} />
						{curves.map((c, i) => {
							const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
								c.length,
								strokeWidth,
								{
									style: dash,
									snap: 1,
									start: 'outset',
									end: 'outset',
									closed: true,
								}
							)
							return (
								<path
									key={`curve_${i}`}
									d={c.getSvgPathData()}
									strokeWidth={strokeWidth}
									fill="none"
									stroke={theme[color].solid}
									strokeDasharray={strokeDasharray}
									strokeDashoffset={strokeDashoffset}
									pointerEvents="all"
								/>
							)
						})}
					</>
				)
			} else {
				const d = getDrawHeartPath(w, h, strokeWidth, shape.id)
				return (
					<>
						<ShapeFill d={d} color={color} fill={fill} theme={theme} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			}
		}
		default: {
			const geometry = editor.getShapeGeometry(shape)
			const outline =
				geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices
			const lines = getLines(shape.props, strokeWidth)

			if (dash === 'solid') {
				let d = 'M' + outline[0] + 'L' + outline.slice(1) + 'Z'

				if (lines) {
					for (const [A, B] of lines) {
						d += `M${A.x},${A.y}L${B.x},${B.y}`
					}
				}

				return (
					<>
						<ShapeFill theme={theme} d={d} color={color} fill={fill} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			} else if (dash === 'dashed' || dash === 'dotted') {
				const innerPath = 'M' + outline[0] + 'L' + outline.slice(1) + 'Z'

				return (
					<>
						<ShapeFill theme={theme} d={innerPath} fill={fill} color={color} />
						<g
							strokeWidth={strokeWidth}
							stroke={theme[color].solid}
							fill="none"
							pointerEvents="all"
						>
							{Array.from(Array(outline.length)).map((_, i) => {
								const A = Vec.ToFixed(outline[i])
								const B = Vec.ToFixed(outline[(i + 1) % outline.length])
								const dist = Vec.Dist(A, B)
								const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
									dist,
									strokeWidth,
									{
										style: dash,
										start: 'outset',
										end: 'outset',
									}
								)

								return (
									<line
										key={i}
										x1={A.x}
										y1={A.y}
										x2={B.x}
										y2={B.y}
										strokeDasharray={strokeDasharray}
										strokeDashoffset={strokeDashoffset}
									/>
								)
							})}
							{lines &&
								lines.map(([A, B], i) => {
									const dist = Vec.Dist(A, B)

									const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
										dist,
										strokeWidth,
										{
											style: dash,
											start: 'skip',
											end: 'skip',
											snap: dash === 'dotted' ? 4 : undefined,
										}
									)

									return (
										<path
											key={`line_fg_${i}`}
											d={`M${A.x},${A.y}L${B.x},${B.y}`}
											stroke={theme[color].solid}
											strokeWidth={strokeWidth}
											fill="none"
											strokeDasharray={strokeDasharray}
											strokeDashoffset={strokeDashoffset}
										/>
									)
								})}
						</g>
					</>
				)
			} else if (dash === 'draw') {
				const polygonPoints = getRoundedPolygonPoints(
					id,
					outline,
					strokeWidth / 3,
					strokeWidth * 2,
					2
				)
				let d = getRoundedInkyPolygonPath(polygonPoints)

				if (lines) {
					for (const [A, B] of lines) {
						d += `M${A.toFixed()}L${B.toFixed()}`
					}
				}

				const innerPolygonPoints = getRoundedPolygonPoints(id, outline, 0, strokeWidth * 2, 1)
				const innerPathData = getRoundedInkyPolygonPath(innerPolygonPoints)

				return (
					<>
						<ShapeFill d={innerPathData} fill={fill} color={color} theme={theme} />
						<path d={d} stroke={theme[color].solid} strokeWidth={strokeWidth} fill="none" />
					</>
				)
			}
		}
	}
}
