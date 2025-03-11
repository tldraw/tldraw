import {
	assert,
	exhaustiveSwitchError,
	getPerfectDashProps,
	rng,
	toDomPrecision,
	Vec,
	VecLike,
} from '@tldraw/editor'
import { SVGProps } from 'react'

export interface BaseSvgPathBuilderOpts {
	strokeWidth: number
	forceSolid?: boolean
	props?: SVGProps<SVGPathElement & SVGGElement>
}

export interface SolidSvgPathBuilderOpts extends BaseSvgPathBuilderOpts {
	style: 'solid'
}

export interface DashedSvgPathBuilderOpts extends BaseSvgPathBuilderOpts {
	style: 'dashed' | 'dotted'
	snap?: number
	end?: 'skip' | 'outset' | 'none'
	start?: 'skip' | 'outset' | 'none'
	lengthRatio?: number
}

export interface DrawSvgPathBuilderOpts extends BaseSvgPathBuilderOpts {
	style: 'draw'
	randomSeed: string
	offset?: number
	roundness?: number
	passes?: number
}

export type SvgPathBuilderOpts =
	| SolidSvgPathBuilderOpts
	| DashedSvgPathBuilderOpts
	| DrawSvgPathBuilderOpts

interface SegmentOpts {
	offset?: number
	roundness?: number
}

interface MoveToSvgPathBuilderSegment {
	type: 'moveTo'
	x: number
	y: number
	opts?: SegmentOpts
}

interface LineToSvgPathBuilderSegment {
	type: 'lineTo'
	x: number
	y: number
	opts?: SegmentOpts
}

interface ArcToSvgPathBuilderSegment {
	type: 'arcTo'
	radius: number
	largeArcFlag: boolean
	sweepFlag: boolean
	x: number
	y: number
	opts?: SegmentOpts
}

type SvgPathBuilderSegment = LineToSvgPathBuilderSegment | ArcToSvgPathBuilderSegment

interface SvgPathBuilderLine {
	initial: MoveToSvgPathBuilderSegment
	segments: SvgPathBuilderSegment[]
	closed: boolean
}

export class SvgPathBuilder {
	static throughPoints(points: VecLike[]) {
		const path = new SvgPathBuilder()
		path.moveTo(points[0].x, points[0].y)
		for (let i = 1; i < points.length; i++) {
			path.lineTo(points[i].x, points[i].y)
		}
		return path
	}

	constructor() {}

	private lines: SvgPathBuilderLine[] = []

	private currentLine() {
		const lastLine = this.lines[this.lines.length - 1]
		assert(lastLine, 'Start an SVGPathBuilder with `.moveTo()`')
		assert(!lastLine.closed, 'Cannot work on a closed line')
		return lastLine
	}

	moveTo(x: number, y: number, opts?: SegmentOpts) {
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

	build(opts: SvgPathBuilderOpts) {
		if (opts.forceSolid) {
			return this.buildSolid(opts)
		}
		switch (opts.style) {
			case 'solid':
				return this.buildSolid(opts)
			case 'dashed':
			case 'dotted':
				return this.buildDashed(opts)
			case 'draw':
				return this.buildDraw(opts)
			default:
				exhaustiveSwitchError(opts, 'style')
		}
	}

	private buildSolid(opts: SvgPathBuilderOpts) {
		const { strokeWidth, props } = opts

		const parts = []
		for (const { initial, segments, closed } of this.lines) {
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

		return <path strokeWidth={strokeWidth} d={parts.join(' ')} {...props} />
	}

	private buildDashed(opts: DashedSvgPathBuilderOpts) {
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

	private buildDraw(opts: DrawSvgPathBuilderOpts) {
		const {
			strokeWidth,
			randomSeed,
			offset: defaultOffset = strokeWidth / 3,
			roundness: defaultRoundness = strokeWidth * 2,
			passes = 2,
			props,
		} = opts

		const random = rng(randomSeed)

		const parts = []

		for (let pass = 0; pass < passes; pass++) {
			for (const { initial, segments, closed } of this.lines) {
				const initialOffset = initial.opts?.offset ?? defaultOffset
				const initialPOffset = {
					x: initial.x + random() * initialOffset,
					y: initial.y + random() * initialOffset,
				}

				const offsetPoints = segments.map(({ x, y, opts }) => {
					const offset = opts?.offset ?? defaultOffset
					return {
						x: x + random() * offset,
						y: y + random() * offset,
					}
				})

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

					const previousOffsetP = i === 0 ? initialPOffset : offsetPoints[i - 1]
					const nextOffsetP =
						i === segments.length - 1 && !closed
							? null
							: offsetPoints[(i + 1) % offsetPoints.length]

					switch (segment.type) {
						case 'lineTo':
						case 'moveTo': {
							if (!nextOffsetP) {
								parts.push('L', toDomPrecision(offsetP.x), toDomPrecision(offsetP.y))
								break
							}

							const nudgeBeforeAmount = Math.min(Vec.Dist(previousOffsetP, offsetP) / 2, roundness)
							const nudgeBefore = Vec.Nudge(offsetP, previousOffsetP, nudgeBeforeAmount)

							const nudgeAfterAmount = Math.min(Vec.Dist(nextOffsetP, offsetP) / 2, roundness)
							const nudgeAfter = Vec.Nudge(offsetP, nextOffsetP, nudgeAfterAmount)

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

	private segmentLength(lastPoint: VecLike, segment: SvgPathBuilderSegment) {
		switch (segment.type) {
			case 'lineTo':
				return Vec.Dist(lastPoint, segment)
			case 'arcTo':
				return arcSegmentLength(lastPoint, segment)
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
function arcSegmentLength(
	lastPoint: VecLike,
	{ radius, largeArcFlag, sweepFlag, x, y }: ArcToSvgPathBuilderSegment
) {
	// In accordance to: http://www.w3.org/TR/SVG/implnote.html#ArcOutOfRangeParameters
	radius = Math.abs(radius)

	// If the endpoints are identical, then this is equivalent to omitting the elliptical arc segment entirely.
	if (lastPoint.x === x && lastPoint.y === y) {
		return 0
	}

	// If radius is 0 then this arc is treated as a straight line segment joining the endpoints.
	if (radius === 0) {
		return Vec.Dist(lastPoint, { x, y })
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
	// const center = {
	// 	x: transformedCenter.x + (lastPoint.x + x) / 2,
	// 	y: transformedCenter.y + (lastPoint.y + y) / 2,
	// }

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

	return Math.abs(sweepAngle * radius)
}
