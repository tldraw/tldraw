import {
	approximately,
	assert,
	assertExists,
	clamp,
	CubicBezier2d,
	Edge2d,
	exhaustiveSwitchError,
	Geometry2d,
	Geometry2dFilters,
	Geometry2dOptions,
	getPerfectDashProps,
	getVerticesCountForArcLength,
	Group2d,
	modulate,
	PerfectDashTerminal,
	rng,
	toDomPrecision,
	Vec,
	VecLike,
	VecModel,
} from '@tldraw/editor'
import { ReactNode, SVGProps } from 'react'

/** @public */
export interface BasePathBuilderOpts {
	strokeWidth: number
	forceSolid?: boolean
	onlyFilled?: boolean
	props?: SVGProps<SVGPathElement & SVGGElement>
}

/** @public */
export interface SolidPathBuilderOpts extends BasePathBuilderOpts {
	style: 'solid'
}

/** @public */
export interface DashedPathBuilderOpts extends BasePathBuilderOpts {
	style: 'dashed' | 'dotted'
	snap?: number
	end?: PerfectDashTerminal
	start?: PerfectDashTerminal
	lengthRatio?: number
}

/** @public */
export interface DrawPathBuilderDOpts {
	strokeWidth: number
	randomSeed: string
	offset?: number
	roundness?: number
	passes?: number
	onlyFilled?: boolean
}

/** @public */
export interface DrawPathBuilderOpts extends BasePathBuilderOpts, DrawPathBuilderDOpts {
	style: 'draw'
}

/** @public */
export type PathBuilderOpts = SolidPathBuilderOpts | DashedPathBuilderOpts | DrawPathBuilderOpts

/** @public */
export interface PathBuilderCommandOpts {
	/**
	 * When converting to a draw-style line, how much offset from the original point should be
	 * applied?
	 */
	offset?: number
	/**
	 * When converting to a draw-style line, how much roundness should be applied to the end of this
	 * line?
	 */
	roundness?: number
	/**
	 * When converting to a dash- or dot-style line, should the current segment be merged with the
	 * previous segment when calculating the dash pattern? This is false by default, meaning each
	 * command will start/end on a dash/dot boundary.
	 */
	mergeWithPrevious?: boolean
}

/** @internal */
export interface PathBuilderCommandInfo {
	tangentStart: VecModel
	tangentEnd: VecModel
	length: number
}

/** @internal */
export interface PathBuilderCommandBase {
	opts?: PathBuilderCommandOpts
	x: number
	y: number
	isClose: boolean
	_info?: PathBuilderCommandInfo
}

/** @public */
export interface PathBuilderLineOpts extends PathBuilderCommandOpts {
	geometry?: Omit<Geometry2dOptions, 'isClosed'> | false
	dashStart?: PerfectDashTerminal
	dashEnd?: PerfectDashTerminal
}

/** @internal */
export interface MoveToPathBuilderCommand extends PathBuilderCommandBase {
	type: 'move'
	closeIdx: number | null
	opts?: PathBuilderLineOpts
}

/** @internal */
export interface LineToPathBuilderCommand extends PathBuilderCommandBase {
	type: 'line'
}

/** @internal */
export interface CubicBezierToPathBuilderCommand extends PathBuilderCommandBase {
	type: 'cubic'
	cp1: VecModel
	cp2: VecModel
	resolution?: number
}

/** @internal */
export type PathBuilderCommand =
	| MoveToPathBuilderCommand
	| LineToPathBuilderCommand
	| CubicBezierToPathBuilderCommand

/** @public */
export interface PathBuilderToDOpts {
	startIdx?: number
	endIdx?: number
	onlyFilled?: boolean
}

/** @public */
export class PathBuilder {
	static lineThroughPoints(
		points: VecLike[],
		opts?: PathBuilderLineOpts & { endOffsets?: number }
	) {
		const path = new PathBuilder()
		path.moveTo(points[0].x, points[0].y, { ...opts, offset: opts?.endOffsets ?? opts?.offset })
		for (let i = 1; i < points.length; i++) {
			const isLast = i === points.length - 1
			path.lineTo(points[i].x, points[i].y, isLast ? { offset: opts?.endOffsets } : undefined)
		}
		return path
	}

	static cubicSplineThroughPoints(
		points: VecLike[],
		opts?: PathBuilderLineOpts & { endOffsets?: number }
	) {
		const path = new PathBuilder()
		const len = points.length
		const last = len - 2
		const k = 1.25

		path.moveTo(points[0].x, points[0].y, { ...opts, offset: opts?.endOffsets ?? opts?.offset })

		for (let i = 0; i < len - 1; i++) {
			const p0 = i === 0 ? points[0] : points[i - 1]
			const p1 = points[i]
			const p2 = points[i + 1]
			const p3 = i === last ? p2 : points[i + 2]

			let cp1x, cp1y, cp2x, cp2y
			if (i === 0) {
				cp1x = p0.x
				cp1y = p0.y
			} else {
				cp1x = p1.x + ((p2.x - p0.x) / 6) * k
				cp1y = p1.y + ((p2.y - p0.y) / 6) * k
			}

			let pointOpts = undefined
			if (i === last) {
				cp2x = p2.x
				cp2y = p2.y
				pointOpts = { offset: opts?.endOffsets }
			} else {
				cp2x = p2.x - ((p3.x - p1.x) / 6) * k
				cp2y = p2.y - ((p3.y - p1.y) / 6) * k
			}

			path.cubicBezierTo(p2.x, p2.y, cp1x, cp1y, cp2x, cp2y, pointOpts)
		}

		return path
	}

	constructor() {}

	/** @internal */
	commands: PathBuilderCommand[] = []

	private lastMoveTo: MoveToPathBuilderCommand | null = null
	private assertHasMoveTo() {
		assert(this.lastMoveTo, 'Start an SVGPathBuilder with `.moveTo()`')
		return this.lastMoveTo
	}

	moveTo(x: number, y: number, opts?: PathBuilderLineOpts) {
		this.lastMoveTo = { type: 'move', x, y, closeIdx: null, isClose: false, opts }
		this.commands.push(this.lastMoveTo)
		return this
	}

	lineTo(x: number, y: number, opts?: PathBuilderCommandOpts) {
		this.assertHasMoveTo()
		this.commands.push({ type: 'line', x, y, isClose: false, opts })
		return this
	}

	circularArcTo(
		radius: number,
		largeArcFlag: boolean,
		sweepFlag: boolean,
		x2: number,
		y2: number,
		opts?: PathBuilderCommandOpts
	) {
		return this.arcTo(radius, radius, largeArcFlag, sweepFlag, 0, x2, y2, opts)
	}

	arcTo(
		rx: number,
		ry: number,
		largeArcFlag: boolean,
		sweepFlag: boolean,
		xAxisRotationRadians: number,
		x2: number,
		y2: number,
		opts?: PathBuilderCommandOpts
	) {
		// As arc flags make them very sensitive to offsets when we render them in draw mode, we
		// approximate arcs by converting them to up to 4 (1 per 90° segment) cubic bezier curves.
		// This algorithm is a Claude special:
		// https://claude.ai/public/artifacts/5ea0bf18-4afb-4b3d-948d-31b8a77ef1e2

		this.assertHasMoveTo()

		const x1 = this.commands[this.commands.length - 1].x
		const y1 = this.commands[this.commands.length - 1].y

		// If the endpoints are identical, don't add a command
		if (x1 === x2 && y1 === y2) {
			return this
		}

		// If rx or ry is 0, return a straight line
		if (rx === 0 || ry === 0) {
			return this.lineTo(x2, y2, opts)
		}

		// Convert angle from degrees to radians
		const phi = xAxisRotationRadians
		const sinPhi = Math.sin(phi)
		const cosPhi = Math.cos(phi)

		// Ensure rx and ry are positive
		let rx1 = Math.abs(rx)
		let ry1 = Math.abs(ry)

		// Step 1: Compute (x1', y1') - transform from ellipse coordinate system to unit circle
		const dx = (x1 - x2) / 2
		const dy = (y1 - y2) / 2
		const x1p = cosPhi * dx + sinPhi * dy
		const y1p = -sinPhi * dx + cosPhi * dy

		// Correction of out-of-range radii
		const lambda = (x1p * x1p) / (rx1 * rx1) + (y1p * y1p) / (ry1 * ry1)
		if (lambda > 1) {
			const sqrtLambda = Math.sqrt(lambda)
			rx1 *= sqrtLambda
			ry1 *= sqrtLambda
		}

		// Step 2: Compute (cx', cy') - center of ellipse in transformed system
		const sign = largeArcFlag !== sweepFlag ? 1 : -1

		const term = rx1 * rx1 * ry1 * ry1 - rx1 * rx1 * y1p * y1p - ry1 * ry1 * x1p * x1p
		const numerator = rx1 * rx1 * y1p * y1p + ry1 * ry1 * x1p * x1p

		let radicand = term / numerator
		radicand = radicand < 0 ? 0 : radicand

		const coef = sign * Math.sqrt(radicand)

		const cxp = coef * ((rx1 * y1p) / ry1)
		const cyp = coef * (-(ry1 * x1p) / rx1)

		// Step 3: Compute (cx, cy) from (cx', cy') - transform back to original coordinate system
		const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
		const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2

		// Step 4: Compute the start and end angles
		const ux = (x1p - cxp) / rx1
		const uy = (y1p - cyp) / ry1
		const vx = (-x1p - cxp) / rx1
		const vy = (-y1p - cyp) / ry1

		const startAngle = Math.atan2(uy, ux)
		let endAngle = Math.atan2(vy, vx)

		// Ensure correct sweep direction
		if (!sweepFlag && endAngle > startAngle) {
			endAngle -= 2 * Math.PI
		} else if (sweepFlag && endAngle < startAngle) {
			endAngle += 2 * Math.PI
		}

		// Calculate the sweep angle
		const sweepAngle = endAngle - startAngle

		// Calculate the approximate arc length. General ellipse arc length is expensive - there's
		// no closed form solution, so we have to do iterative numerical approximation. As we only
		// use this to control the resolution of later approximations, let's cheat and just use the
		// circular arc length with the largest radius:
		const approximateArcLength = Math.max(rx1, ry1) * Math.abs(sweepAngle)

		// Approximate the arc using cubic bezier curves
		const numSegments = Math.min(4, Math.ceil(Math.abs(sweepAngle) / (Math.PI / 2)))
		const resolutionPerSegment = Math.ceil(
			getVerticesCountForArcLength(approximateArcLength) / numSegments
		)
		const anglePerSegment = sweepAngle / numSegments

		// Helper function to compute point on ellipse
		const ellipsePoint = (angle: number) => {
			return {
				x: cx + rx1 * Math.cos(angle) * cosPhi - ry1 * Math.sin(angle) * sinPhi,
				y: cy + rx1 * Math.cos(angle) * sinPhi + ry1 * Math.sin(angle) * cosPhi,
			}
		}

		// Helper function to compute derivative (tangent vector) at a point on the ellipse
		const ellipseDerivative = (angle: number) => {
			return {
				x: -rx1 * Math.sin(angle) * cosPhi - ry1 * Math.cos(angle) * sinPhi,
				y: -rx1 * Math.sin(angle) * sinPhi + ry1 * Math.cos(angle) * cosPhi,
			}
		}

		// Generate cubic bezier approximations
		for (let i = 0; i < numSegments; i++) {
			const theta1 = startAngle + i * anglePerSegment
			const theta2 = startAngle + (i + 1) * anglePerSegment
			const deltaTheta = theta2 - theta1

			const start = ellipsePoint(theta1)
			const end = ellipsePoint(theta2)

			// Get the derivative at the start and end points
			const d1 = ellipseDerivative(theta1)
			const d2 = ellipseDerivative(theta2)

			// Calculate the length of the tangent handles
			// This is a key factor for the accuracy of the approximation
			// For a 90° arc, the handle length should be 4/3 * tan(π/8) * r
			// For smaller arcs, we scale this value by the angle ratio
			const handleScale = (4 / 3) * Math.tan(deltaTheta / 4)

			// Create control points that are tangent to the ellipse at the endpoints
			const cp1x = start.x + handleScale * d1.x
			const cp1y = start.y + handleScale * d1.y

			const cp2x = end.x - handleScale * d2.x
			const cp2y = end.y - handleScale * d2.y

			const bezierOpts = i === 0 ? opts : { ...opts, mergeWithPrevious: true }
			this.cubicBezierToWithResolution(
				end.x,
				end.y,
				cp1x,
				cp1y,
				cp2x,
				cp2y,
				bezierOpts,
				resolutionPerSegment
			)
		}

		return this
	}

	cubicBezierTo(
		x: number,
		y: number,
		cp1X: number,
		cp1Y: number,
		cp2X: number,
		cp2Y: number,
		opts?: PathBuilderCommandOpts
	) {
		return this.cubicBezierToWithResolution(x, y, cp1X, cp1Y, cp2X, cp2Y, opts)
	}
	private cubicBezierToWithResolution(
		x: number,
		y: number,
		cp1X: number,
		cp1Y: number,
		cp2X: number,
		cp2Y: number,
		opts?: PathBuilderCommandOpts,
		resolution?: number
	) {
		this.assertHasMoveTo()
		this.commands.push({
			type: 'cubic',
			x,
			y,
			cp1: { x: cp1X, y: cp1Y },
			cp2: { x: cp2X, y: cp2Y },
			isClose: false,
			opts,
			resolution,
		})
		return this
	}

	close() {
		const lastMoveTo = this.assertHasMoveTo()
		const lastCommand = this.commands[this.commands.length - 1]

		if (approximately(lastMoveTo.x, lastCommand.x) && approximately(lastMoveTo.y, lastCommand.y)) {
			lastCommand.isClose = true
		} else {
			this.commands.push({
				type: 'line',
				x: lastMoveTo.x,
				y: lastMoveTo.y,
				isClose: true,
			})
		}

		lastMoveTo.closeIdx = this.commands.length - 1
		this.lastMoveTo = null
		return this
	}

	toD(opts: PathBuilderToDOpts = {}) {
		const { startIdx = 0, endIdx = this.commands.length, onlyFilled = false } = opts
		const parts = []

		let isSkippingCurrentLine = false

		let didAddMove = false
		let didAddNaturalMove = false

		const addMoveIfNeeded = (i: number) => {
			if (didAddMove || i === 0) return
			didAddMove = true
			const command = this.commands[i - 1]
			parts.push('M', toDomPrecision(command.x), toDomPrecision(command.y))
		}

		for (let i = startIdx; i < endIdx; i++) {
			const command = this.commands[i]
			switch (command.type) {
				case 'move': {
					const isFilled =
						command.opts?.geometry === false ? false : (command.opts?.geometry?.isFilled ?? false)
					if (onlyFilled && !isFilled) {
						isSkippingCurrentLine = true
					} else {
						isSkippingCurrentLine = false
						didAddMove = true
						didAddNaturalMove = true
						parts.push('M', toDomPrecision(command.x), toDomPrecision(command.y))
					}
					break
				}
				case 'line':
					if (isSkippingCurrentLine) break
					addMoveIfNeeded(i)
					if (command.isClose && didAddNaturalMove) {
						parts.push('Z')
					} else {
						parts.push('L', toDomPrecision(command.x), toDomPrecision(command.y))
					}
					break
				case 'cubic':
					if (isSkippingCurrentLine) break
					addMoveIfNeeded(i)
					parts.push(
						'C',
						toDomPrecision(command.cp1.x),
						toDomPrecision(command.cp1.y),
						toDomPrecision(command.cp2.x),
						toDomPrecision(command.cp2.y),
						toDomPrecision(command.x),
						toDomPrecision(command.y)
					)
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
				const d = this.toDrawSvg(opts)
				return d
			}
			default:
				exhaustiveSwitchError(opts, 'style')
		}
	}

	toGeometry(): PathBuilderGeometry2d | Group2d {
		const geometries = []

		let current: null | {
			startIdx: number
			moveCommand: MoveToPathBuilderCommand
			isClosed: boolean
			opts?: PathBuilderLineOpts
		} = null
		for (let i = 0; i < this.commands.length; i++) {
			const command = this.commands[i]

			if (command.type === 'move') {
				if (current && current.opts?.geometry !== false) {
					geometries.push(
						new PathBuilderGeometry2d(this, current.startIdx, i, {
							...current.opts?.geometry,
							isFilled: current.opts?.geometry?.isFilled ?? false,
							isClosed: current.moveCommand.closeIdx !== null,
						})
					)
				}
				current = { startIdx: i, moveCommand: command, opts: command.opts, isClosed: false }
			}

			if (command.isClose) {
				assert(current, 'No current move command')
				current.isClosed = true
			}
		}

		if (current && current.opts?.geometry !== false) {
			geometries.push(
				new PathBuilderGeometry2d(this, current.startIdx, this.commands.length, {
					...current.opts?.geometry,
					isFilled: current.opts?.geometry?.isFilled ?? false,
					isClosed: current.moveCommand.closeIdx !== null,
				})
			)
		}

		assert(geometries.length > 0)
		if (geometries.length === 1) return geometries[0]
		return new Group2d({ children: geometries })
	}

	private toSolidSvg(opts: PathBuilderOpts) {
		const { strokeWidth, props } = opts

		return (
			<path strokeWidth={strokeWidth} d={this.toD({ onlyFilled: opts.onlyFilled })} {...props} />
		)
	}

	private toDashedSvg(opts: DashedPathBuilderOpts) {
		const {
			style,
			strokeWidth,
			snap,
			lengthRatio,
			props: { markerStart, markerEnd, ...props } = {},
		} = opts

		const parts: ReactNode[] = []

		let isCurrentPathClosed = false
		let isSkippingCurrentLine = false
		let currentLineOpts: PathBuilderLineOpts | undefined = undefined

		let currentRun: {
			startIdx: number
			endIdx: number
			isFirst: boolean
			isLast: boolean
			length: number
			lineOpts: PathBuilderLineOpts | undefined
			pathIsClosed: boolean
		} | null = null

		const addCurrentRun = () => {
			if (!currentRun) return
			const { startIdx, endIdx, isFirst, isLast, length, lineOpts, pathIsClosed } = currentRun
			currentRun = null

			if (startIdx === endIdx && this.commands[startIdx].type === 'move') return

			const start = lineOpts?.dashStart ?? opts.start
			const end = lineOpts?.dashEnd ?? opts.end
			const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(length, strokeWidth, {
				style,
				snap,
				lengthRatio,
				start: isFirst ? (start ?? (pathIsClosed ? 'outset' : 'none')) : 'outset',
				end: isLast ? (end ?? (pathIsClosed ? 'outset' : 'none')) : 'outset',
			})

			const d = this.toD({ startIdx, endIdx: endIdx + 1 })
			parts.push(
				<path
					key={parts.length}
					d={d}
					strokeDasharray={strokeDasharray}
					strokeDashoffset={strokeDashoffset}
					markerStart={isFirst ? markerStart : undefined}
					markerEnd={isLast ? markerEnd : undefined}
				/>
			)
		}

		for (let i = 0; i < this.commands.length; i++) {
			const command = this.commands[i]
			const lastCommand = this.commands[i - 1]
			if (command.type === 'move') {
				isCurrentPathClosed = command.closeIdx !== null
				const isFilled =
					command.opts?.geometry === false ? false : (command.opts?.geometry?.isFilled ?? false)
				if (opts.onlyFilled && !isFilled) {
					isSkippingCurrentLine = true
				} else {
					isSkippingCurrentLine = false
					currentLineOpts = command.opts
				}
				continue
			}

			if (isSkippingCurrentLine) continue

			const segmentLength = this.calculateSegmentLength(lastCommand, command)
			const isFirst = lastCommand.type === 'move'
			const isLast =
				command.isClose || i === this.commands.length - 1 || this.commands[i + 1]?.type === 'move'

			if (currentRun && command.opts?.mergeWithPrevious) {
				currentRun.length += segmentLength
				currentRun.endIdx = i
				currentRun.isLast = isLast
			} else {
				addCurrentRun()
				currentRun = {
					startIdx: i,
					endIdx: i,
					isFirst,
					isLast,
					length: segmentLength,
					lineOpts: currentLineOpts,
					pathIsClosed: isCurrentPathClosed,
				}
			}
		}

		addCurrentRun()

		return (
			<g strokeWidth={strokeWidth} {...props}>
				{parts}
			</g>
		)
	}

	private toDrawSvg(opts: DrawPathBuilderOpts) {
		return <path strokeWidth={opts.strokeWidth} d={this.toDrawD(opts)} {...opts.props} />
	}

	toDrawD(opts: DrawPathBuilderDOpts) {
		const {
			strokeWidth,
			randomSeed,
			offset: defaultOffset = strokeWidth / 3,
			roundness: defaultRoundness = strokeWidth * 2,
			passes = 2,
			onlyFilled = false,
		} = opts

		const parts = []

		const commandInfo = this.getCommandInfo()

		// for each command, we draw the line for the command, plus the corner to the next command.
		const drawCommands = []
		let lastMoveCommandIdx = null
		for (let i = 0; i < this.commands.length; i++) {
			const command = this.commands[i]
			const offset = command.opts?.offset ?? defaultOffset
			const roundness = command.opts?.roundness ?? defaultRoundness

			if (command.type === 'move') {
				lastMoveCommandIdx = i
			}

			const nextIdx = command.isClose
				? assertExists(lastMoveCommandIdx) + 1
				: !this.commands[i + 1] || this.commands[i + 1].type === 'move'
					? undefined
					: i + 1

			const nextInfo =
				nextIdx !== undefined && this.commands[nextIdx] && this.commands[nextIdx]?.type !== 'move'
					? commandInfo[nextIdx]
					: undefined

			const currentSupportsRoundness = commandsSupportingRoundness[command.type]
			const nextSupportsRoundness =
				nextIdx !== undefined ? commandsSupportingRoundness[this.commands[nextIdx].type] : false

			const currentInfo = commandInfo[i]

			const tangentToPrev = currentInfo?.tangentEnd
			const tangentToNext = nextInfo?.tangentStart

			const roundnessClampedForAngle =
				currentSupportsRoundness &&
				nextSupportsRoundness &&
				tangentToPrev &&
				tangentToNext &&
				Vec.Len2(tangentToPrev) > 0.01 &&
				Vec.Len2(tangentToNext) > 0.01
					? modulate(
							Math.abs(Vec.AngleBetween(tangentToPrev, tangentToNext)),
							[Math.PI / 2, Math.PI],
							[roundness, 0],
							true
						)
					: 0

			const shortestDistance = Math.min(
				currentInfo?.length ?? Infinity,
				nextInfo?.length ?? Infinity
			)
			const offsetLimit = shortestDistance - roundnessClampedForAngle * 2

			const offsetAmount = clamp(offset, 0, offsetLimit / 4)

			const roundnessBeforeClampedForLength = Math.min(
				roundnessClampedForAngle,
				(currentInfo?.length ?? Infinity) / 4
			)
			const roundnessAfterClampedForLength = Math.min(
				roundnessClampedForAngle,
				(nextInfo?.length ?? Infinity) / 4
			)

			const drawCommand = {
				command,
				offsetAmount,
				roundnessBefore: roundnessBeforeClampedForLength,
				roundnessAfter: roundnessAfterClampedForLength,
				tangentToPrev: commandInfo[i]?.tangentEnd,
				tangentToNext: nextInfo?.tangentStart,
				moveDidClose: false,
			}

			drawCommands.push(drawCommand)

			if (command.isClose && lastMoveCommandIdx !== null) {
				const lastMoveCommand = drawCommands[lastMoveCommandIdx]
				lastMoveCommand.moveDidClose = true
				lastMoveCommand.roundnessAfter = roundnessAfterClampedForLength
			} else if (command.type === 'move') {
				lastMoveCommandIdx = i
			}
		}

		for (let pass = 0; pass < passes; pass++) {
			const random = rng(randomSeed + pass)

			let lastMoveToOffset = { x: 0, y: 0 }
			let isSkippingCurrentLine = false
			for (const {
				command,
				offsetAmount,
				roundnessBefore,
				roundnessAfter,
				tangentToNext,
				tangentToPrev,
			} of drawCommands) {
				const offset = command.isClose
					? lastMoveToOffset
					: { x: random() * offsetAmount, y: random() * offsetAmount }

				if (command.type === 'move') {
					lastMoveToOffset = offset
					const isFilled =
						command.opts?.geometry === false ? false : (command.opts?.geometry?.isFilled ?? false)
					if (onlyFilled && !isFilled) {
						isSkippingCurrentLine = true
					} else {
						isSkippingCurrentLine = false
					}
				}

				if (isSkippingCurrentLine) continue

				const offsetPoint = Vec.Add(command, offset)

				const endPoint =
					tangentToNext && roundnessAfter > 0
						? Vec.Mul(tangentToNext, -roundnessAfter).add(offsetPoint)
						: offsetPoint

				const startPoint =
					tangentToPrev && roundnessBefore > 0
						? Vec.Mul(tangentToPrev, roundnessBefore).add(offsetPoint)
						: offsetPoint

				if (endPoint === offsetPoint || startPoint === offsetPoint) {
					switch (command.type) {
						case 'move':
							parts.push('M', toDomPrecision(endPoint.x), toDomPrecision(endPoint.y))
							break
						case 'line':
							parts.push('L', toDomPrecision(endPoint.x), toDomPrecision(endPoint.y))
							break
						case 'cubic': {
							const offsetCp1 = Vec.Add(command.cp1, offset)
							const offsetCp2 = Vec.Add(command.cp2, offset)
							parts.push(
								'C',
								toDomPrecision(offsetCp1.x),
								toDomPrecision(offsetCp1.y),
								toDomPrecision(offsetCp2.x),
								toDomPrecision(offsetCp2.y),
								toDomPrecision(endPoint.x),
								toDomPrecision(endPoint.y)
							)
							break
						}
						default:
							exhaustiveSwitchError(command, 'type')
					}
				} else {
					switch (command.type) {
						case 'move':
							parts.push('M', toDomPrecision(endPoint.x), toDomPrecision(endPoint.y))
							break
						case 'line':
							parts.push(
								'L',
								toDomPrecision(startPoint.x),
								toDomPrecision(startPoint.y),

								'Q',
								toDomPrecision(offsetPoint.x),
								toDomPrecision(offsetPoint.y),
								toDomPrecision(endPoint.x),
								toDomPrecision(endPoint.y)
							)
							break
						case 'cubic': {
							const offsetCp1 = Vec.Add(command.cp1, offset)
							const offsetCp2 = Vec.Add(command.cp2, offset)
							parts.push(
								'C',
								toDomPrecision(offsetCp1.x),
								toDomPrecision(offsetCp1.y),
								toDomPrecision(offsetCp2.x),
								toDomPrecision(offsetCp2.y),
								toDomPrecision(offsetPoint.x),
								toDomPrecision(offsetPoint.y)
							)
							break
						}
						default:
							exhaustiveSwitchError(command, 'type')
					}
				}
			}
		}

		return parts.join(' ')
	}

	private calculateSegmentLength(lastPoint: VecLike, command: PathBuilderCommand) {
		switch (command.type) {
			case 'move':
				return 0
			case 'line':
				return Vec.Dist(lastPoint, command)
			case 'cubic':
				return CubicBezier.length(
					lastPoint.x,
					lastPoint.y,
					command.cp1.x,
					command.cp1.y,
					command.cp2.x,
					command.cp2.y,
					command.x,
					command.y
				)
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
		const commandInfo: Array<undefined | PathBuilderCommandInfo> = []
		for (let i = 1; i < this.commands.length; i++) {
			const previous = this.commands[i - 1]
			const current = this.commands[i]

			if (current._info) {
				commandInfo[i] = current._info
				continue
			}

			if (current.type === 'move') {
				continue
			}

			let tangentStart, tangentEnd
			switch (current.type) {
				case 'line':
					tangentStart = tangentEnd = Vec.Sub(previous, current).uni()
					break
				case 'cubic': {
					tangentStart = Vec.Sub(current.cp1, previous).uni()
					tangentEnd = Vec.Sub(current.cp2, current).uni()
					break
				}
				default:
					exhaustiveSwitchError(current, 'type')
			}

			current._info = {
				tangentStart,
				tangentEnd,
				length: this.calculateSegmentLength(previous, current),
			}
			commandInfo[i] = current._info
		}

		return commandInfo
	}
}

const commandsSupportingRoundness = {
	line: true,
	move: true,
	cubic: false,
} as const satisfies Record<PathBuilderCommand['type'], boolean>

/** @public */
export class PathBuilderGeometry2d extends Geometry2d {
	constructor(
		private readonly path: PathBuilder,
		private readonly startIdx: number,
		private readonly endIdx: number,
		options: Geometry2dOptions
	) {
		super(options)
	}

	private _segments: Geometry2d[] | null = null
	getSegments() {
		if (this._segments) return this._segments

		this._segments = []
		let last = this.path.commands[this.startIdx]
		assert(last.type === 'move')

		for (let i = this.startIdx + 1; i < this.endIdx; i++) {
			const command = this.path.commands[i]
			assert(command.type !== 'move')

			switch (command.type) {
				case 'line':
					this._segments.push(new Edge2d({ start: Vec.From(last), end: Vec.From(command) }))
					break
				case 'cubic': {
					this._segments.push(
						new CubicBezier2d({
							start: Vec.From(last),
							cp1: Vec.From(command.cp1),
							cp2: Vec.From(command.cp2),
							end: Vec.From(command),
							resolution: command.resolution,
						})
					)
					break
				}
				default:
					exhaustiveSwitchError(command, 'type')
			}

			last = command
		}

		return this._segments
	}

	override getVertices(filters: Geometry2dFilters): Vec[] {
		const vs = this.getSegments()
			.flatMap((s) => s.getVertices(filters))
			.filter((vertex, i, vertices) => {
				const prev = vertices[i - 1]
				if (!prev) return true
				return !Vec.Equals(prev, vertex)
			})

		if (this.isClosed) {
			const last = vs[vs.length - 1]
			const first = vs[0]
			if (!Vec.Equals(last, first)) {
				vs.push(first)
			}
		}

		return vs
	}

	override nearestPoint(point: VecLike, _filters?: Geometry2dFilters): Vec {
		let nearest: Vec | null = null
		let nearestDistance = Infinity

		for (const segment of this.getSegments()) {
			const candidate = segment.nearestPoint(point)
			const distance = Vec.Dist2(point, candidate)
			if (distance < nearestDistance) {
				nearestDistance = distance
				nearest = candidate
			}
		}

		assert(nearest, 'No nearest point found')
		return nearest
	}

	override hitTestLineSegment(
		A: VecLike,
		B: VecLike,
		distance = 0,
		filters?: Geometry2dFilters
	): boolean {
		return super.hitTestLineSegment(A, B, distance, filters)
	}
	override getSvgPathData(): string {
		return this.path.toD({ startIdx: this.startIdx, endIdx: this.endIdx })
	}
}

/*!
 * Adapted from https://github.com/adobe-webplatform/Snap.svg/tree/master
 * Apache License: https://github.com/adobe-webplatform/Snap.svg/blob/master/LICENSE
 * https://github.com/adobe-webplatform/Snap.svg/blob/c8e483c9694517e24b282f8f59f985629f4994ce/dist/snap.svg.js#L5786
 */
const CubicBezier = {
	base3(t: number, p1: number, p2: number, p3: number, p4: number) {
		const t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4
		const t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3
		return t * t2 - 3 * p1 + 3 * p2
	},
	/**
	 * Calculate the approximate length of a cubic bezier curve from (x1, y1) to (x4, y4) with
	 * control points (x2, y2) and (x3, y3).
	 */
	length(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3: number,
		y3: number,
		x4: number,
		y4: number,
		z = 1
	) {
		z = z > 1 ? 1 : z < 0 ? 0 : z
		const z2 = z / 2
		const n = 12

		let sum = 0
		sum = 0
		for (let i = 0; i < n; i++) {
			const ct = z2 * CubicBezier.Tvalues[i] + z2
			const xbase = CubicBezier.base3(ct, x1, x2, x3, x4)
			const ybase = CubicBezier.base3(ct, y1, y2, y3, y4)
			const comb = xbase * xbase + ybase * ybase
			sum += CubicBezier.Cvalues[i] * Math.sqrt(comb)
		}
		return z2 * sum
	},
	Tvalues: [
		-0.1252, 0.1252, -0.3678, 0.3678, -0.5873, 0.5873, -0.7699, 0.7699, -0.9041, 0.9041, -0.9816,
		0.9816,
	],
	Cvalues: [
		0.2491, 0.2491, 0.2335, 0.2335, 0.2032, 0.2032, 0.1601, 0.1601, 0.1069, 0.1069, 0.0472, 0.0472,
	],
}
