import { CubicSegment2d, LineSegment2d } from '@tldraw/primitives'
import { TLDefaultDashStyle } from '@tldraw/tlschema'
import { getPerfectDashProps } from '../../shared/getPerfectDashProps'

export interface SegmentProps {
	strokeWidth: number
	dash: TLDefaultDashStyle
	segment: LineSegment2d | CubicSegment2d
	location: 'start' | 'middle' | 'end' | 'solo'
}

export function Segment({ segment, dash, strokeWidth, location }: SegmentProps) {
	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(segment.length, strokeWidth, {
		style: dash,
		start: location === 'end' || location === 'middle' ? 'outset' : 'none',
		end: location === 'start' || location === 'middle' ? 'outset' : 'none',
	})

	return (
		<path strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} d={segment.path} />
	)
}

export function SegmentSvg({ segment, dash, strokeWidth, location }: SegmentProps) {
	const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(segment.length, strokeWidth, {
		style: dash,
		start: location === 'end' || location === 'middle' ? 'outset' : 'none',
		end: location === 'start' || location === 'middle' ? 'outset' : 'none',
	})

	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
	path.setAttribute('stroke-dasharray', strokeDasharray.toString())
	path.setAttribute('stroke-dashoffset', strokeDashoffset.toString())
	path.setAttribute('d', segment.path)

	return path
}
