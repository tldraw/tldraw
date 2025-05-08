import {
	assert,
	clamp,
	exhaustiveSwitchError,
	Geometry2dOptions,
	getPerfectDashProps,
	Group2d,
	invLerp,
	lerp,
	Polygon2d,
	Polyline2d,
	rng,
	toDomPrecision,
	Vec,
	VecLike,
	VecModel,
} from '@tldraw/editor'
import { SVGProps } from 'react'

function getVerticesCountForLength(length: number, spacing = 20) {
	return Math.max(8, Math.ceil(length / spacing))
}

export interface BasePathBuilderOpts {
	strokeWidth: number
	forceSolid?: boolean
	props?: SVGProps<SVGPathElement & SVGGElement>
}

export interface SolidPathBuilderOpts extends BasePathBuilderOpts {
	style: 'solid'
}

export interface DashedPathBuilderOpts extends BasePathBuilderOpts {
	style: 'dashed' | 'dotted'
	snap?: number
	end?: 'skip' | 'outset' | 'none'
	start?: 'skip' | 'outset' | 'none'
	lengthRatio?: number
}

export interface DrawPathBuilderOpts extends BasePathBuilderOpts {
	style: 'draw'
	randomSeed: string
	offset?: number
	roundness?: number
	passes?: number
}

export type PathBuilderOpts = SolidPathBuilderOpts | DashedPathBuilderOpts | DrawPathBuilderOpts

interface SegmentOpts {
	offset?: number
	roundness?: number
}

interface LineOpts extends SegmentOpts {
	geometry?: Omit<Geometry2dOptions, 'isClosed'> | false
}

interface MoveToPathBuilderSegment {
	type: 'moveTo'
	x: number
	y: number
	opts?: LineOpts
}

interface LineToPathBuilderSegment {
	type: 'lineTo'
	x: number
	y: number
	opts?: SegmentOpts
}

interface ArcToPathBuilderSegment {
	type: 'arcTo'
	radius: number
	largeArcFlag: boolean
	sweepFlag: boolean
	x: number
	y: number
	opts?: SegmentOpts
}

type PathBuilderSegment = LineToPathBuilderSegment | ArcToPathBuilderSegment

interface PathBuilderLine {
	initial: MoveToPathBuilderSegment
	segments: PathBuilderSegment[]
	closed: boolean
}

export class PathBuilder {
	static throughPoints(points: VecLike[], opts?: LineOpts) {
		const path = new PathBuilder()
		path.moveTo(points[0].x, points[0].y, opts)
		for (let i = 1; i < points.length; i++) {
			path.lineTo(points[i].x, points[i].y)
		}
		return path
	}

	constructor() {}

	private lines: PathBuilderLine[] = []

	private currentLine() {
		const lastLine = this.lines[this.lines.length - 1]
		assert(lastLine, 'Start an SVGPathBuilder with `.moveTo()`')
		assert(!lastLine.closed, 'Cannot work on a closed line')
		return lastLine
	}

	moveTo(x: number, y: number, opts?: LineOpts) {
		this.lines.push({
			initial: { type: 'moveTo', x, y, opts },
			segments: [],
			closed: false,
		})
		return this
	}

	lineTo(x: number, y: number, opts?: SegmentOpts) {
		this.currentLine().segments.push({ type: 'lineTo', x, y, opts })
		return this
	}

	arcTo(
		radius: number,
		largeArcFlag: boolean,
		sweepFlag: boolean,
		x: number,
		y: number,
		opts?: SegmentOpts
	) {
		this.currentLine().segments.push({
			type: 'arcTo',
			radius,
			largeArcFlag,
			sweepFlag,
			x,
			y,
			opts,
		})
		return this
	}
	close() {
		this.currentLine().closed = true
		return this
	}

	toD(opts: { closedOnly?: boolean } = {}) {
		const closedOnly = opts.closedOnly ?? false
		const parts = []
		for (const { initial, segments, closed } of this.lines) {
			if (closedOnly && !closed) continue
			parts.push('M', toDomPrecision(initial.x), toDomPrecision(initial.y))
			for (const segment of segments) {
				switch (segment.type) {
					case 'lineTo':
						parts.push('L', toDomPrecision(segment.x), toDomPrecision(segment.y))
						break
					case 'arcTo':
						parts.push(
							'A',
							segment.radius,
							segment.radius,
							0,
							segment.largeArcFlag ? '1' : '0',
							segment.sweepFlag ? '1' : '0',
							toDomPrecision(segment.x),
							toDomPrecision(segment.y)
						)
						break
				}
			}
			if (closed) {
				parts.push('Z')
			}
		}
		return parts.join(' ')
	}

	toSvg(opts: PathBuilderOpts) {
		if (opts.forceSolid) {
			return this.toSolidSvg(opts)
		}
		switch (opts.style) {
			case 'solid':
				return this.toSolidSvg(opts)
			case 'dashed':
			case 'dotted':
				return this.toDashedSvg(opts)
			case 'draw':
				return this.toDrawSvg(opts)
			default:
				exhaustiveSwitchError(opts, 'style')
		}
	}

	toGeometry() {
		const geometries = []
		for (const { initial, segments, closed } of this.lines) {
			if (initial.opts?.geometry === false) continue
			const vertices = [new Vec(initial.x, initial.y)]
			for (const segment of segments) {
				switch (segment.type) {
					case 'lineTo': {
						vertices.push(new Vec(segment.x, segment.y))
						break
					}
					case 'arcTo': {
						const info = getArcSegmentInfo(vertices[vertices.length - 1], segment)
						if (info === null) break
						if (info === 'straight-line') {
							vertices.push(new Vec(segment.x, segment.y))
							break
						}

						const verticesCount = getVerticesCountForLength(info.length)
						for (let i = 0; i < verticesCount + 1; i++) {
							const t = (i / verticesCount) * info.sweepAngle
							const point = Vec.Rot(info.startVector, t).mul(info.radius).add(info.center)
							vertices.push(point)
						}
						break
					}
					default:
						exhaustiveSwitchError(segment, 'type')
				}
			}

			const geometry = closed
				? new Polygon2d({ points: vertices, isFilled: false, ...initial.opts?.geometry })
				: new Polyline2d({ points: vertices, ...initial.opts?.geometry })

			geometries.push(geometry)
		}

		if (geometries.length === 0) return null
		if (geometries.length === 1) return geometries[0]
		return new Group2d({ children: geometries })
	}

	private toSolidSvg(opts: PathBuilderOpts) {
		const { strokeWidth, props } = opts

		return <path strokeWidth={strokeWidth} d={this.toD()} {...props} />
	}

	private toDashedSvg(opts: DashedPathBuilderOpts) {
		const {
			style,
			strokeWidth,
			snap,
			end,
			start,
			lengthRatio,
			props: { markerStart, markerEnd, ...props } = {},
		} = opts

		const parts = []
		for (const { initial, segments, closed } of this.lines) {
			let lastPoint: VecLike = initial

			for (let i = 0; i < segments.length; i++) {
				const segment = segments[i]
				const isFirst = i === 0
				const isLast = i === segments.length - 1 && !closed

				const segmentLength = this.segmentLength(lastPoint, segment)
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
					segmentLength,
					strokeWidth,
					{
						style,
						snap,
						lengthRatio,
						start: isFirst ? (closed ? 'none' : start) : 'outset',
						end: isLast ? (closed ? 'none' : end) : 'outset',
					}
				)

				switch (segment.type) {
					case 'lineTo':
						parts.push(
							<line
								key={i}
								x1={toDomPrecision(lastPoint.x)}
								y1={toDomPrecision(lastPoint.y)}
								x2={toDomPrecision(segment.x)}
								y2={toDomPrecision(segment.y)}
								strokeDasharray={strokeDasharray}
								strokeDashoffset={strokeDashoffset}
								markerStart={isFirst ? markerStart : undefined}
								markerEnd={isLast ? markerEnd : undefined}
							/>
						)
						break
					case 'arcTo':
						parts.push(
							<path
								key={i}
								d={[
									'M',
									toDomPrecision(lastPoint.x),
									toDomPrecision(lastPoint.y),
									'A',
									segment.radius,
									segment.radius,
									0,
									segment.largeArcFlag ? '1' : '0',
									segment.sweepFlag ? '1' : '0',
									toDomPrecision(segment.x),
									toDomPrecision(segment.y),
								].join(' ')}
								strokeDasharray={strokeDasharray}
								strokeDashoffset={strokeDashoffset}
								markerStart={isFirst ? markerStart : undefined}
								markerEnd={isLast ? markerEnd : undefined}
							/>
						)
						break
					default:
						exhaustiveSwitchError(segment, 'type')
				}

				lastPoint = segment
			}

			if (closed && lastPoint !== initial) {
				const dist = Vec.Dist(lastPoint, initial)
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(dist, strokeWidth, {
					style,
					snap,
					lengthRatio,
					start: 'outset',
					end: 'none',
				})

				parts.push(
					<line
						key="last"
						x1={toDomPrecision(lastPoint.x)}
						y1={toDomPrecision(lastPoint.y)}
						x2={toDomPrecision(initial.x)}
						y2={toDomPrecision(initial.y)}
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
						markerEnd={markerEnd}
					/>
				)
			}
		}

		return (
			<g strokeWidth={strokeWidth} {...props}>
				{parts}
			</g>
		)
	}

	private toDrawSvg(opts: DrawPathBuilderOpts) {
		const {
			strokeWidth,
			randomSeed,
			offset: defaultOffset = strokeWidth / 3,
			roundness: defaultRoundness = strokeWidth * 2,
			passes = 2,
			props,
		} = opts

		const parts = []

		const tangents = this.lines.map(({ initial, segments, closed }) => {
			const tangents = []
			const segmentCount = closed ? segments.length + 1 : segments.length

			for (let i = 0; i < segmentCount; i++) {
				let previous: PathBuilderSegment | MoveToPathBuilderSegment = segments[i - 1]
				let current: PathBuilderSegment | MoveToPathBuilderSegment = segments[i]
				let next: PathBuilderSegment | MoveToPathBuilderSegment = segments[i + 1]

				if (!previous) previous = initial
				if (!current) {
					current = initial
					next = segments[0]
				}
				if (!next) {
					next = initial
				}

				let tangentBefore, tangentAfter
				switch (current.type) {
					case 'lineTo':
					case 'moveTo': {
						tangentBefore = Vec.Sub(previous, current).norm()
						break
					}
					case 'arcTo': {
						const info = getArcSegmentInfo(previous, current)
						if (info === null || info === 'straight-line') {
							tangentBefore = Vec.Sub(current, previous).norm().per()
							break
						}

						tangentBefore = Vec.Per(info.endVector).mul(Math.sign(info.sweepAngle))
						break
					}
					default:
						exhaustiveSwitchError(current, 'type')
				}

				switch (next.type) {
					case 'lineTo':
					case 'moveTo': {
						tangentAfter = Vec.Sub(next, current).norm()
						break
					}
					case 'arcTo': {
						const info = getArcSegmentInfo(current, next)
						if (info === null || info === 'straight-line') {
							tangentAfter = Vec.Sub(next, current).norm().per()
							break
						}

						tangentAfter = Vec.Per(info.startVector).mul(Math.sign(info.sweepAngle))
						break
					}
					default:
						exhaustiveSwitchError(next, 'type')
				}

				tangents.push({ tangentBefore, tangentAfter })
			}

			return tangents
		})

		for (let pass = 0; pass < passes; pass++) {
			for (let lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
				const { initial, segments, closed } = this.lines[lineIdx]
				const random = rng(randomSeed + pass + lineIdx)
				const initialOffset = initial.opts?.offset ?? defaultOffset
				const initialPOffset = {
					x: initial.x + random() * initialOffset,
					y: initial.y + random() * initialOffset,
				}

				const offsetPoints: VecModel[] = []
				let lastDistance = Vec.Dist(initialPOffset, segments[0])

				for (let i = 0; i < segments.length; i++) {
					const segment = segments[i]
					const nextSegment =
						i === segments.length - 1 ? (closed ? segments[0] : null) : segments[i + 1]
					const nextDistance = nextSegment ? Vec.Dist(segment, nextSegment) : Infinity

					const shortestDistance =
						Math.min(lastDistance, nextDistance) - (segment.opts?.roundness ?? defaultRoundness)

					const offset = clamp(segment.opts?.offset ?? defaultOffset, 0, shortestDistance / 10)
					const offsetPoint = {
						x: segment.x + random() * offset,
						y: segment.y + random() * offset,
					}

					offsetPoints.push(offsetPoint)
					lastDistance = nextDistance
				}

				if (closed) {
					const roundness = initial.opts?.roundness ?? defaultRoundness
					offsetPoints.push(initialPOffset)

					const next = offsetPoints[0]
					const nudgeAmount = Math.min(Vec.Dist(initialPOffset, next) / 2, roundness)
					const nudged = Vec.Nudge(initialPOffset, next, nudgeAmount)
					parts.push('M', toDomPrecision(nudged.x), toDomPrecision(nudged.y))
				} else {
					parts.push('M', toDomPrecision(initialPOffset.x), toDomPrecision(initialPOffset.y))
				}

				const segmentCount = closed ? segments.length + 1 : segments.length
				for (let i = 0; i < segmentCount; i++) {
					const segment = i === segments.length ? initial : segments[i]
					const roundness = segment.opts?.roundness ?? defaultRoundness
					const offsetP = offsetPoints[i]
					const { tangentBefore, tangentAfter } = tangents[lineIdx][i]

					const previousOffsetP = i === 0 ? initialPOffset : offsetPoints[i - 1]
					const nextOffsetP =
						i === segments.length - 1 && !closed
							? null
							: offsetPoints[(i + 1) % offsetPoints.length]

					switch (segment.type) {
						case 'lineTo':
						case 'moveTo': {
							if (!nextOffsetP || roundness === 0) {
								parts.push('L', toDomPrecision(offsetP.x), toDomPrecision(offsetP.y))
								break
							}

							const clampedRoundness = lerp(
								roundness,
								0,
								clamp(
									invLerp(
										Math.PI / 2,
										Math.PI,
										Math.abs(Vec.AngleBetween(tangentBefore, tangentAfter))
									),
									0,
									1
								)
							)

							const nudgeBeforeAmount = Math.min(
								Vec.Dist(previousOffsetP, offsetP) / 2,
								clampedRoundness
							)
							const nudgeBefore = Vec.Mul(tangentBefore, nudgeBeforeAmount).add(offsetP)

							const nudgeAfterAmount = Math.min(
								Vec.Dist(nextOffsetP, offsetP) / 2,
								clampedRoundness
							)
							const nudgeAfter = Vec.Mul(tangentAfter, nudgeAfterAmount).add(offsetP)

							parts.push(
								'L',
								toDomPrecision(nudgeBefore.x),
								toDomPrecision(nudgeBefore.y),
								'Q',
								toDomPrecision(offsetP.x),
								toDomPrecision(offsetP.y),
								toDomPrecision(nudgeAfter.x),
								toDomPrecision(nudgeAfter.y)
							)
							break
						}
						case 'arcTo':
							parts.push(
								'A',
								segment.radius,
								segment.radius,
								0,
								segment.largeArcFlag ? '1' : '0',
								segment.sweepFlag ? '1' : '0',
								toDomPrecision(offsetP.x),
								toDomPrecision(offsetP.y)
							)
							break
						default:
							exhaustiveSwitchError(segment, 'type')
					}
				}

				if (closed) {
					parts.push('Z')
				}
			}
		}

		return <path strokeWidth={strokeWidth} d={parts.join(' ')} {...props} />
	}

	private segmentLength(lastPoint: VecLike, segment: PathBuilderSegment) {
		switch (segment.type) {
			case 'lineTo':
				return Vec.Dist(lastPoint, segment)
			case 'arcTo': {
				const info = getArcSegmentInfo(lastPoint, segment)
				if (info === null) return 0
				if (info === 'straight-line') return Vec.Dist(lastPoint, segment)
				return info.length
			}
			default:
				exhaustiveSwitchError(segment, 'type')
		}
	}
}

/*!
 * Adapted from https://github.com/rveciana/svg-path-properties
 * MIT License: https://github.com/rveciana/svg-path-properties/blob/master/LICENSE
 * https://github.com/rveciana/svg-path-properties/blob/74d850d14998274f6eae279424bdc2194f156490/src/arc.ts#L121
 */
function getArcSegmentInfo(
	lastPoint: VecLike,
	{ radius, largeArcFlag, sweepFlag, x, y }: ArcToPathBuilderSegment
) {
	// In accordance to: http://www.w3.org/TR/SVG/implnote.html#ArcOutOfRangeParameters
	radius = Math.abs(radius)

	// If the endpoints are identical, then this is equivalent to omitting the elliptical arc segment entirely.
	if (lastPoint.x === x && lastPoint.y === y) {
		return null
	}

	// If radius is 0 then this arc is treated as a straight line segment joining the endpoints.
	if (radius === 0) {
		return 'straight-line'
	}

	// Following "Conversion from endpoint to center parameterization"
	// http://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter

	// Step #1: Compute transformedPoint
	const dx = (lastPoint.x - x) / 2
	const dy = (lastPoint.y - y) / 2

	// Ensure radii are large enough
	const radiiCheck = Math.pow(dx, 2) / Math.pow(radius, 2) + Math.pow(dy, 2) / Math.pow(radius, 2)

	if (radiiCheck > 1) {
		radius = Math.sqrt(radiiCheck) * radius
	}

	// Step #2: Compute transformedCenter
	const cSquareNumerator =
		Math.pow(radius, 2) * Math.pow(radius, 2) -
		Math.pow(radius, 2) * Math.pow(dy, 2) -
		Math.pow(radius, 2) * Math.pow(dx, 2)
	const cSquareRootDenom =
		Math.pow(radius, 2) * Math.pow(dy, 2) + Math.pow(radius, 2) * Math.pow(dx, 2)
	let cRadicand = cSquareNumerator / cSquareRootDenom
	// Make sure this never drops below zero because of precision
	cRadicand = cRadicand < 0 ? 0 : cRadicand
	const cCoef = (largeArcFlag !== sweepFlag ? 1 : -1) * Math.sqrt(cRadicand)
	const transformedCenter = {
		x: cCoef * ((radius * dy) / radius),
		y: cCoef * (-(radius * dx) / radius),
	}

	// Step #3: Compute center
	const center = {
		x: transformedCenter.x + (lastPoint.x + x) / 2,
		y: transformedCenter.y + (lastPoint.y + y) / 2,
	}

	// Step #4: Compute start/sweep angles
	// Start angle of the elliptical arc prior to the stretch and rotate operations.
	// Difference between the start and end angles
	const startVector = {
		x: (dx - transformedCenter.x) / radius,
		y: (dy - transformedCenter.y) / radius,
	}
	// const startAngle = Vec.AngleBetween({ x: 1, y: 0 }, startVector)

	const endVector = {
		x: (-dx - transformedCenter.x) / radius,
		y: (-dy - transformedCenter.y) / radius,
	}
	let sweepAngle = Vec.AngleBetween(startVector, endVector)

	if (!sweepFlag && sweepAngle > 0) {
		sweepAngle -= 2 * Math.PI
	} else if (sweepFlag && sweepAngle < 0) {
		sweepAngle += 2 * Math.PI
	}
	// We use % instead of `mod(..)` because we want it to be -360deg to 360deg(but actually in radians)
	sweepAngle %= 2 * Math.PI

	return {
		length: Math.abs(sweepAngle * radius),
		radius,
		sweepAngle,
		startVector,
		endVector,
		center,
	}
}
