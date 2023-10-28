import classNames from 'classnames'
import * as React from 'react'
import {
	type GapsSnapLine,
	type PointsSnapLine,
	type SnapLine,
} from '../../editor/managers/SnapManager'
import { rangeIntersection } from '../../primitives/utils'

function PointsSnapLine({ points, zoom }: { zoom: number } & PointsSnapLine) {
	const l = 2.5 / zoom

	const minX = points.reduce((acc, p) => Math.min(acc, p.x), Infinity)
	const maxX = points.reduce((acc, p) => Math.max(acc, p.x), -Infinity)
	const minY = points.reduce((acc, p) => Math.min(acc, p.y), Infinity)
	const maxY = points.reduce((acc, p) => Math.max(acc, p.y), -Infinity)

	const useNWtoSEdireciton = points.some((p) => p.x === minX && p.y === minY)
	let firstX: number, firstY: number, secondX: number, secondY: number
	if (useNWtoSEdireciton) {
		firstX = minX
		firstY = minY
		secondX = maxX
		secondY = maxY
	} else {
		firstX = minX
		firstY = maxY
		secondX = maxX
		secondY = minY
	}

	return (
		<g className="tl-snap-line">
			<line x1={firstX} y1={firstY} x2={secondX} y2={secondY} />
			{points.map((p, i) => (
				<g transform={`translate(${p.x},${p.y})`} key={i}>
					<path
						className="tl-snap-point"
						d={`M ${-l},${-l} L ${l},${l} M ${-l},${l} L ${l},${-l}`}
					/>
				</g>
			))}
		</g>
	)
}

function GapsSnapLine({ gaps, direction, zoom }: { zoom: number } & GapsSnapLine) {
	const l = 3.5 / zoom

	let edgeIntersection: number[] | null = [-Infinity, +Infinity]
	let nextEdgeIntersection: number[] | null = null

	const horizontal = direction === 'horizontal'

	// find intersection of all gaps so we can render a straight line through it;
	// some range intersections may return null, in which case we skip that gap.
	for (const gap of gaps) {
		nextEdgeIntersection = rangeIntersection(
			edgeIntersection[0],
			edgeIntersection[1],
			horizontal ? gap.startEdge[0].y : gap.startEdge[0].x,
			horizontal ? gap.startEdge[1].y : gap.startEdge[1].x
		)

		if (nextEdgeIntersection) {
			edgeIntersection = nextEdgeIntersection
		} else {
			continue
		}

		nextEdgeIntersection = rangeIntersection(
			edgeIntersection[0],
			edgeIntersection[1],
			horizontal ? gap.endEdge[0].y : gap.endEdge[0].x,
			horizontal ? gap.endEdge[1].y : gap.endEdge[1].x
		)

		if (nextEdgeIntersection) {
			edgeIntersection = nextEdgeIntersection
		} else {
			continue
		}
	}

	if (edgeIntersection === null) {
		return null
	}

	const midPoint = (edgeIntersection[0] + edgeIntersection[1]) / 2

	return (
		<g className="tl-snap-line">
			{gaps.map(({ startEdge, endEdge }, i) => (
				<React.Fragment key={i}>
					{horizontal ? (
						// horizontal gap
						<>
							{/* start edge */}
							<line
								x1={startEdge[0].x}
								y1={midPoint - 2 * l}
								x2={startEdge[1].x}
								y2={midPoint + 2 * l}
							/>
							{/* end edge */}
							<line
								x1={endEdge[0].x}
								y1={midPoint - 2 * l}
								x2={endEdge[1].x}
								y2={midPoint + 2 * l}
							/>
							{/* joining line */}
							<line x1={startEdge[0].x} y1={midPoint} x2={endEdge[0].x} y2={midPoint} />
							{/* center point marker */}
							<line
								x1={(startEdge[0].x + endEdge[0].x) / 2}
								y1={midPoint - l}
								x2={(startEdge[0].x + endEdge[0].x) / 2}
								y2={midPoint + l}
							/>
						</>
					) : (
						// vertical gap
						<>
							{/* start edge */}
							<line
								x1={midPoint - 2 * l}
								y1={startEdge[0].y}
								x2={midPoint + 2 * l}
								y2={startEdge[1].y}
							/>
							{/* end edge */}
							<line
								x1={midPoint - 2 * l}
								y1={endEdge[0].y}
								x2={midPoint + 2 * l}
								y2={endEdge[1].y}
							/>
							{/* joining line */}
							<line x1={midPoint} y1={startEdge[0].y} x2={midPoint} y2={endEdge[0].y} />
							{/* center point marker */}
							<line
								x1={midPoint - l}
								y1={(startEdge[0].y + endEdge[0].y) / 2}
								x2={midPoint + l}
								y2={(startEdge[0].y + endEdge[0].y) / 2}
							/>
						</>
					)}
				</React.Fragment>
			))}
		</g>
	)
}

/** @public */
export type TLSnapLineComponent = React.ComponentType<{
	className?: string
	line: SnapLine
	zoom: number
}>

/** @public */
export const DefaultSnapLine: TLSnapLineComponent = ({ className, line, zoom }) => {
	return (
		<svg className={classNames('tl-overlays__item', className)}>
			{line.type === 'points' ? (
				<PointsSnapLine {...line} zoom={zoom} />
			) : line.type === 'gaps' ? (
				<GapsSnapLine {...line} zoom={zoom} />
			) : null}
		</svg>
	)
}
