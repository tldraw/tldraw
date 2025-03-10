import { exhaustiveSwitchError, getPerfectDashProps, TLDefaultDashStyle, Vec } from '@tldraw/editor'
import { GetPerfectDashPropsOpts } from '@tldraw/editor/src/lib/editor/shapes/shared/getPerfectDashProps'
import { SVGProps } from 'react'
import { TLArcArrowInfo, TLArrowInfo, TLStraightArrowInfo } from './arrow-types'
import { ElbowArrowRoute } from './elbow/elbowArrowRoutes'
import { getRouteHandlePath } from './elbow/getElbowArrowInfo'

export interface ArrowPathProps extends SVGProps<SVGPathElement & SVGGElement> {
	info: TLArrowInfo
	dash: TLDefaultDashStyle | GetPerfectDashPropsOpts
	strokeWidth?: number
	isForceSolid: boolean
	range: 'body' | 'handle'
}

export function ArrowPath({ info, range, ...props }: ArrowPathProps) {
	switch (info.type) {
		case 'straight':
			return <StraightArrowPath info={info} range={range} {...props} />
		case 'arc':
			return <ArcArrowPath info={info} range={range} {...props} />
		case 'elbow':
			return (
				<ElbowArrowPath
					route={range === 'body' ? info.route : getRouteHandlePath(info.elbow, info.route)}
					{...props}
				/>
			)
		default:
			exhaustiveSwitchError(info, 'type')
	}
}

export interface ElbowArrowPathProps extends SVGProps<SVGPathElement & SVGGElement> {
	route: ElbowArrowRoute
	dash: TLDefaultDashStyle | GetPerfectDashPropsOpts
	strokeWidth?: number
	isForceSolid: boolean
}

export function ElbowArrowPath({
	route,
	dash,
	strokeWidth,
	isForceSolid,
	markerStart,
	markerEnd,
	...props
}: ElbowArrowPathProps) {
	if (dash === 'solid' || dash === 'draw') {
		const parts = [`M${route.points[0].x},${route.points[0].y}`]
		for (let i = 1; i < route.points.length; i++) {
			parts.push(`L${route.points[i].x},${route.points[i].y}`)
		}
		return (
			<path
				d={parts.join('')}
				strokeWidth={strokeWidth}
				{...props}
				markerStart={markerStart}
				markerEnd={markerEnd}
			/>
		)
	}

	const parts = []
	for (let i = 1; i < route.points.length; i++) {
		const A = Vec.ToFixed(route.points[i - 1])
		const B = Vec.ToFixed(route.points[i])
		const dist = Vec.Dist(A, B)
		const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
			dist,
			strokeWidth ?? 1,
			typeof dash === 'string'
				? { style: dash, start: 'outset', end: 'outset', forceSolid: isForceSolid }
				: {
						...dash,
						start: i === 0 ? dash.start : 'outset',
						end: i === route.points.length - 1 ? dash.end : 'outset',
					}
		)
		parts.push(
			<line
				key={i}
				x1={A.x}
				y1={A.y}
				x2={B.x}
				y2={B.y}
				strokeDasharray={strokeDasharray}
				strokeDashoffset={strokeDashoffset}
				markerStart={i === 0 ? markerStart : undefined}
				markerEnd={i === route.points.length - 1 ? markerEnd : undefined}
			/>
		)
	}

	return (
		<g strokeWidth={strokeWidth} {...props}>
			{parts}
		</g>
	)
}

export interface StraightArrowPathProps extends SVGProps<SVGPathElement> {
	info: TLStraightArrowInfo
	range: 'body' | 'handle'
	dash: TLDefaultDashStyle | GetPerfectDashPropsOpts
	strokeWidth?: number
	isForceSolid: boolean
}

export function StraightArrowPath({
	info,
	range,
	dash,
	strokeWidth,
	isForceSolid,
	...props
}: StraightArrowPathProps) {
	let start, end
	switch (range) {
		case 'body':
			start = info.start.point
			end = info.end.point
			break
		case 'handle':
			start = info.start.handle
			end = info.end.handle
			break
		default:
			exhaustiveSwitchError(range)
	}

	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
		Vec.Dist(start, end),
		strokeWidth ?? 1,
		typeof dash === 'string' ? { style: dash, forceSolid: isForceSolid } : dash
	)

	const path = `M${start.x},${start.y}L${end.x},${end.y}`

	return (
		<path
			d={path}
			strokeWidth={strokeWidth}
			strokeDasharray={strokeDasharray}
			strokeDashoffset={strokeDashoffset}
			{...props}
		/>
	)
}

export interface ArcArrowPathProps extends SVGProps<SVGPathElement> {
	info: TLArcArrowInfo
	range: 'body' | 'handle'
	dash: TLDefaultDashStyle | GetPerfectDashPropsOpts
	strokeWidth?: number
	isForceSolid: boolean
}
export function ArcArrowPath({
	info,
	range,
	dash,
	strokeWidth,
	isForceSolid,
	...props
}: ArcArrowPathProps) {
	let start, end, radius, largeArcFlag, sweepFlag, length
	switch (range) {
		case 'body':
			start = info.start.point
			end = info.end.point
			radius = info.bodyArc.radius
			largeArcFlag = info.bodyArc.largeArcFlag
			sweepFlag = info.bodyArc.sweepFlag
			length = info.bodyArc.length
			break
		case 'handle':
			start = info.start.handle
			end = info.end.handle
			radius = info.handleArc.radius
			largeArcFlag = info.handleArc.largeArcFlag
			sweepFlag = info.handleArc.sweepFlag
			length = info.handleArc.length
			break
		default:
			exhaustiveSwitchError(range)
	}

	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
		Math.abs(length),
		strokeWidth ?? 1,
		typeof dash === 'string' ? { style: dash, forceSolid: isForceSolid } : dash
	)

	const path = `M${start.x},${start.y} A${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x},${end.y}`

	return (
		<path
			d={path}
			strokeWidth={strokeWidth}
			strokeDasharray={strokeDasharray}
			strokeDashoffset={strokeDashoffset}
			{...props}
		/>
	)
}
