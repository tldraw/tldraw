import { exhaustiveSwitchError, getPerfectDashProps, TLDefaultDashStyle, Vec } from '@tldraw/editor'
import { SVGProps } from 'react'
import { TLArcArrowInfo, TLArrowInfo, TLStraightArrowInfo } from './arrow-types'
import { getSolidCurvedArrowPath, getSolidStraightArrowPath } from './arrowpaths'
import { ElbowArrowRoute } from './elbow/elbowArrowRoutes'

export interface ArrowPathProps extends SVGProps<SVGPathElement & SVGGElement> {
	info: TLArrowInfo
	dash: TLDefaultDashStyle
	strokeWidth?: number
	isForceSolid: boolean
}

export function ArrowPath({ info, dash, strokeWidth, isForceSolid, ...props }: ArrowPathProps) {
	switch (info.type) {
		case 'straight':
			return (
				<StraightArrowPath
					info={info}
					dash={dash}
					strokeWidth={strokeWidth}
					isForceSolid={isForceSolid}
					{...props}
				/>
			)
		case 'arc':
			return (
				<ArcArrowPath
					info={info}
					dash={dash}
					strokeWidth={strokeWidth}
					isForceSolid={isForceSolid}
					{...props}
				/>
			)
		case 'elbow':
			return (
				<ElbowArrowPath
					route={info.route}
					dash={dash}
					strokeWidth={strokeWidth}
					isForceSolid={isForceSolid}
					{...props}
				/>
			)
		default:
			exhaustiveSwitchError(info, 'type')
	}
}

export interface ElbowArrowPathProps extends SVGProps<SVGPathElement & SVGGElement> {
	route: ElbowArrowRoute
	dash: TLDefaultDashStyle
	strokeWidth?: number
	isForceSolid: boolean
}

export function ElbowArrowPath({
	route,
	dash,
	strokeWidth,
	isForceSolid,
	...props
}: ElbowArrowPathProps) {
	switch (dash) {
		case 'solid':
		case 'draw': {
			const parts = [`M${route.points[0].x},${route.points[0].y}`]
			for (let i = 1; i < route.points.length; i++) {
				parts.push(`L${route.points[i].x},${route.points[i].y}`)
			}
			return <path d={parts.join('')} strokeWidth={strokeWidth} {...props} />
		}
		case 'dashed':
		case 'dotted': {
			const parts = []
			for (let i = 1; i < route.points.length; i++) {
				const A = Vec.ToFixed(route.points[i - 1])
				const B = Vec.ToFixed(route.points[i])
				const dist = Vec.Dist(A, B)
				const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(dist, strokeWidth ?? 1, {
					style: dash,
					start: 'outset',
					end: 'outset',
					forceSolid: isForceSolid,
				})
				parts.push(
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
			}

			return (
				<g strokeWidth={strokeWidth} {...props}>
					{parts}
				</g>
			)
		}
		default:
			exhaustiveSwitchError(dash)
	}
}

export interface StraightArrowPathProps extends SVGProps<SVGPathElement> {
	info: TLStraightArrowInfo
	dash: TLDefaultDashStyle
	strokeWidth?: number
	isForceSolid: boolean
}

export function StraightArrowPath({
	info,
	dash,
	strokeWidth,
	isForceSolid,
	...props
}: StraightArrowPathProps) {
	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(info.length, strokeWidth ?? 1, {
		style: dash,
		forceSolid: isForceSolid,
	})

	// TODO: inline this?
	const path = getSolidStraightArrowPath(info)

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
	dash: TLDefaultDashStyle
	strokeWidth?: number
	isForceSolid: boolean
}
export function ArcArrowPath({
	info,
	dash,
	strokeWidth,
	isForceSolid,
	...props
}: ArcArrowPathProps) {
	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
		info.bodyArc.length,
		strokeWidth ?? 1,
		{
			style: dash,
			forceSolid: isForceSolid,
		}
	)

	// TODO: inline this?
	const path = getSolidCurvedArrowPath(info)

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
