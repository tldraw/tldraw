import {
	assert,
	clamp,
	exhaustiveSwitchError,
	Geometry2dOptions,
	getPerfectDashProps,
	Group2d,
	modulate,
	Polygon2d,
	Polyline2d,
	rng,
	toDomPrecision,
	Vec,
	VecLike,
} from '@tldraw/editor'
import { SVGProps } from 'react'

function getVerticesCountForLength(length: number, spacing = 20) {
	return Math.max(8, Math.ceil(length / spacing))
}

/** @internal */
export interface BasePathBuilderOpts {
	strokeWidth: number
	forceSolid?: boolean
	props?: SVGProps<SVGPathElement & SVGGElement>
}

/** @internal */
export interface SolidPathBuilderOpts extends BasePathBuilderOpts {
	style: 'solid'
}

/** @internal */
export interface DashedPathBuilderOpts extends BasePathBuilderOpts {
	style: 'dashed' | 'dotted'
	snap?: number
	end?: 'skip' | 'outset' | 'none'
	start?: 'skip' | 'outset' | 'none'
	lengthRatio?: number
}

/** @internal */
export interface DrawPathBuilderOpts extends BasePathBuilderOpts {
	style: 'draw'
	randomSeed: string
	offset?: number
	roundness?: number
	passes?: number
}

/** @internal */
export type PathBuilderOpts = SolidPathBuilderOpts | DashedPathBuilderOpts | DrawPathBuilderOpts

/** @internal */
interface CommandOpts {
	offset?: number
	roundness?: number
}

/** @internal */
interface LineOpts extends CommandOpts {
	geometry?: Omit<Geometry2dOptions, 'isClosed'> | false
}

/** @internal */
interface MoveToPathBuilderCommand {
	type: 'moveTo'
	x: number
	y: number
	opts?: LineOpts
}

/** @internal */
interface LineToPathBuilderCommand {
	type: 'lineTo'
	x: number
	y: number
	opts?: CommandOpts
}

/** @internal */
interface ArcToPathBuilderCommand {
	type: 'arcTo'
	radius: number
	largeArcFlag: boolean
	sweepFlag: boolean
	x: number
	y: number
	opts?: CommandOpts
}

/** @internal */
interface ClosePathBuilderCommand {
	type: 'close'
	isFilled: boolean
	x: number
	y: number
}

/** @internal */
type PathBuilderCommand =
	| MoveToPathBuilderCommand
	| LineToPathBuilderCommand
	| ArcToPathBuilderCommand
	| ClosePathBuilderCommand

/** @internal */
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

	private commands: PathBuilderCommand[] = []

	private lastMoveTo: MoveToPathBuilderCommand | null = null
	private assertHasMoveTo() {
		assert(this.lastMoveTo, 'Start an SVGPathBuilder with `.moveTo()`')
		return this.lastMoveTo
	}

	moveTo(x: number, y: number, opts?: LineOpts) {
		this.lastMoveTo = { type: 'moveTo', x, y, opts }
		this.commands.push(this.lastMoveTo)
		return this
	}

	lineTo(x: number, y: number, opts?: CommandOpts) {
		this.assertHasMoveTo()
		this.commands.push({ type: 'lineTo', x, y, opts })
		return this
	}

	arcTo(
		radius: number,
		largeArcFlag: boolean,
		sweepFlag: boolean,
		x: number,
		y: number,
		opts?: CommandOpts
	) {
		this.assertHasMoveTo()
		this.commands.push({
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
	close(opts?: { isFilled?: boolean }) {
		const lastMoveTo = this.assertHasMoveTo()
		this.commands.push({
			type: 'close',
			isFilled: opts?.isFilled ?? false,
			x: lastMoveTo.x,
			y: lastMoveTo.y,
		})
		this.lastMoveTo = null
		return this
	}

	toD() {
		const parts = []
		for (const command of this.commands) {
			switch (command.type) {
				case 'moveTo':
					parts.push('M', toDomPrecision(command.x), toDomPrecision(command.y))
					break
				case 'lineTo':
					parts.push('L', toDomPrecision(command.x), toDomPrecision(command.y))
					break
				case 'arcTo':
					parts.push(
						'A',
						command.radius,
						command.radius,
						0,
						command.largeArcFlag ? '1' : '0',
						command.sweepFlag ? '1' : '0',
						toDomPrecision(command.x),
						toDomPrecision(command.y)
					)
					break
				case 'close':
					parts.push('Z')
					break
				default:
					exhaustiveSwitchError(command, 'type')
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
			case 'draw': {
				console.group('draw')
				const d = this.toDrawSvg(opts)
				console.groupEnd()
				return d
			}
			default:
				exhaustiveSwitchError(opts, 'style')
		}
	}

	toGeometry() {
		const geometries = []

		let current: null | { points: Vec[]; opts?: LineOpts } = null
		for (const command of this.commands) {
			switch (command.type) {
				case 'moveTo':
					if (current) {
						if (current.opts?.geometry !== false) {
							geometries.push(new Polyline2d({ points: current.points, ...current.opts?.geometry }))
						}
					}
					current = { points: [new Vec(command.x, command.y)], opts: command.opts }
					break
				case 'lineTo':
					assert(current, 'No current points')
					current.points.push(new Vec(command.x, command.y))
					break
				case 'arcTo': {
					assert(current, 'No current points')
					const info = getArcCommandInfo(current.points[current.points.length - 1], command)
					if (info === null) break
					if (info === 'straight-line') {
						current.points.push(new Vec(command.x, command.y))
						break
					}

					const verticesCount = getVerticesCountForLength(info.length)
					for (let i = 0; i < verticesCount + 1; i++) {
						const t = (i / verticesCount) * info.sweepAngle
						const point = Vec.Rot(info.startVector, t).mul(info.radius).add(info.center)
						current.points.push(point)
					}
					break
				}
				case 'close': {
					assert(current, 'No current points')
					if (current.opts?.geometry !== false) {
						geometries.push(
							new Polygon2d({
								points: current.points,
								isFilled: command.isFilled,
								...current.opts?.geometry,
							})
						)
					}
					current = null
					break
				}
				default:
					exhaustiveSwitchError(command, 'type')
			}
		}

		if (current) {
			if (current.opts?.geometry !== false) {
				geometries.push(new Polyline2d({ points: current.points, ...current.opts?.geometry }))
			}
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

		for (let i = 1; i < this.commands.length; i++) {
			const command = this.commands[i]
			const lastCommand = this.commands[i - 1]
			if (command.type === 'moveTo') continue

			const segmentLength = this.calculateSegmentLength(lastCommand, command)
			const isFirst = lastCommand.type === 'moveTo'
			const isLast =
				command.type === 'close' ||
				i === this.commands.length - 1 ||
				this.commands[i + 1]?.type === 'moveTo'
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

			switch (command.type) {
				case 'lineTo':
				case 'close':
					parts.push(
						<line
							key={i}
							x1={toDomPrecision(lastCommand.x)}
							y1={toDomPrecision(lastCommand.y)}
							x2={toDomPrecision(command.x)}
							y2={toDomPrecision(command.y)}
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
								toDomPrecision(lastCommand.x),
								toDomPrecision(lastCommand.y),
								'A',
								command.radius,
								command.radius,
								0,
								command.largeArcFlag ? '1' : '0',
								command.sweepFlag ? '1' : '0',
								toDomPrecision(command.x),
								toDomPrecision(command.y),
							].join(' ')}
							strokeDasharray={strokeDasharray}
							strokeDashoffset={strokeDashoffset}
							markerStart={isFirst ? markerStart : undefined}
							markerEnd={isLast ? markerEnd : undefined}
						/>
					)
					break
				default:
					exhaustiveSwitchError(command, 'type')
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

		const commandInfo: Array<undefined | { tangentStart: Vec; tangentEnd: Vec; length: number }> =
			[]
		for (let i = 1; i < this.commands.length; i++) {
			const previous = this.commands[i - 1]
			const current = this.commands[i]
			if (current.type === 'moveTo') {
				continue
			}

			let tangentStart, tangentEnd
			switch (current.type) {
				case 'lineTo':
				case 'close':
					tangentStart = tangentEnd = Vec.Sub(previous, current).norm()
					break
				case 'arcTo': {
					const info = getArcCommandInfo(previous, current)
					if (info === null || info === 'straight-line') {
						tangentStart = tangentEnd = Vec.Sub(current, previous).norm().per()
						break
					}

					tangentStart = Vec.Per(info.startVector).mul(Math.sign(info.sweepAngle))
					tangentEnd = Vec.Per(info.endVector).mul(Math.sign(info.sweepAngle))
					break
				}
				default:
					exhaustiveSwitchError(current, 'type')
			}

			commandInfo[i] = {
				tangentStart,
				tangentEnd,
				length: this.calculateSegmentLength(previous, current),
			}
		}
		const tangents = this.commands.map(({ initial, segments, closed }) => {
			const tangents = []
			const segmentCount = closed ? segments.length + 1 : segments.length

			for (let i = 0; i < segmentCount; i++) {
				let previous: PathBuilderCommand | MoveToPathBuilderCommand = segments[i - 1]
				let current: PathBuilderCommand | MoveToPathBuilderCommand = segments[i]
				let next: PathBuilderCommand | MoveToPathBuilderCommand = segments[i + 1]

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
						const info = getArcCommandInfo(previous, current)
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
						const info = getArcCommandInfo(current, next)
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
			for (let lineIdx = 0; lineIdx < this.commands.length; lineIdx++) {
				const { initial, segments, closed } = this.commands[lineIdx]
				const random = rng(randomSeed + pass + lineIdx)

				const initialIX = random()
				const initialIY = random()

				const offsetPoints: { x: number; y: number; clampedRoundness: number }[] = []
				let lastDistance = Vec.Dist(initial, segments[0])

				for (let i = 0; i < (closed ? segments.length + 1 : segments.length); i++) {
					const segment = i === segments.length ? initial : segments[i]

					const roundness = segment.opts?.roundness ?? defaultRoundness
					const { tangentBefore, tangentAfter } = tangents[lineIdx][i]
					const nextSegment =
						i === segments.length - 1 ? (closed ? segments[0] : null) : segments[i + 1]
					const nextDistance = nextSegment ? Vec.Dist(segment, nextSegment) : Infinity

					const clampedRoundness = modulate(
						Math.abs(Vec.AngleBetween(tangentBefore, tangentAfter)),
						[Math.PI / 2, Math.PI],
						[roundness, 0],
						true
					)

					const shortestDistance = Math.min(lastDistance, nextDistance) - clampedRoundness * 2

					const offset = clamp(segment.opts?.offset ?? defaultOffset, 0, shortestDistance / 10)
					const offsetPoint = {
						x: segment.x + random() * offset,
						y: segment.y + random() * offset,
						clampedRoundness,
					}

					offsetPoints.push(offsetPoint)
					lastDistance = nextDistance
				}

				if (closed) {
					const roundness = initial.opts?.roundness ?? defaultRoundness

					const last = offsetPoints[offsetPoints.length - 1]
					const first = offsetPoints[0]
					const nudgeAmount = Math.min(Vec.Dist(last, first) / 2, roundness)
					const nudged = Vec.Nudge(last, first, nudgeAmount)
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

							const clampedRoundness = modulate(
								Math.abs(Vec.AngleBetween(tangentBefore, tangentAfter)),
								[Math.PI / 2, Math.PI],
								[roundness, 0],
								true
							)

							const prevDistance = Vec.Dist(previousOffsetP, offsetP)
							const nextDistance = Vec.Dist(nextOffsetP, offsetP)

							const nudgeBeforeAmount = Math.min(prevDistance / 2, clampedRoundness)
							const nudgeBefore = Vec.Mul(tangentBefore, nudgeBeforeAmount).add(offsetP)

							const nudgeAfterAmount = Math.min(nextDistance / 2, clampedRoundness)
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

	private calculateSegmentLength(
		lastPoint: VecLike,
		command: Exclude<PathBuilderCommand, { type: 'moveTo' }>
	) {
		switch (command.type) {
			case 'lineTo':
			case 'close':
				return Vec.Dist(lastPoint, command)
			case 'arcTo': {
				const info = getArcCommandInfo(lastPoint, command)
				if (info === null) return 0
				if (info === 'straight-line') return Vec.Dist(lastPoint, command)
				return info.length
			}
			default:
				exhaustiveSwitchError(command, 'type')
		}
	}

	/** @internal */
	getCommands(): readonly PathBuilderCommand[] {
		return this.commands
	}

	/** @internal */
	getCommandInfo() {
		const commandInfo: Array<
			| undefined
			| { tangentStart: Vec; tangentEnd: Vec; length: number; command: PathBuilderCommand }
		> = []
		for (let i = 1; i < this.commands.length; i++) {
			const previous = this.commands[i - 1]
			const current = this.commands[i]
			if (current.type === 'moveTo') {
				continue
			}

			let tangentStart, tangentEnd
			switch (current.type) {
				case 'lineTo':
				case 'close':
					tangentStart = tangentEnd = Vec.Sub(previous, current).norm()
					break
				case 'arcTo': {
					const info = getArcCommandInfo(previous, current)
					if (info === null || info === 'straight-line') {
						tangentStart = tangentEnd = Vec.Sub(current, previous).norm().per()
						break
					}

					tangentStart = Vec.Per(info.startVector).mul(Math.sign(info.sweepAngle))
					tangentEnd = Vec.Per(info.endVector).mul(Math.sign(info.sweepAngle))
					break
				}
				default:
					exhaustiveSwitchError(current, 'type')
			}

			commandInfo[i] = {
				tangentStart,
				tangentEnd,
				length: this.calculateSegmentLength(previous, current),
				command: current,
			}
		}

		return commandInfo
	}
}

/*!
 * Adapted from https://github.com/rveciana/svg-path-properties
 * MIT License: https://github.com/rveciana/svg-path-properties/blob/master/LICENSE
 * https://github.com/rveciana/svg-path-properties/blob/74d850d14998274f6eae279424bdc2194f156490/src/arc.ts#L121
 */
function getArcCommandInfo(
	lastPoint: VecLike,
	{ radius, largeArcFlag, sweepFlag, x, y }: ArcToPathBuilderCommand
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
