import { CubicSpline2d, Polyline2d } from '@tldraw/primitives'
import { TLArrowShapeArrowheadStyle, TLDefaultDashStyle } from '@tldraw/tlschema'
import { Segment, SegmentSvg } from './Segment'
/**
 * A base interface for a shape's arrowheads.
 *
 * @public
 */
export interface TLArrowHeadModel {
	id: string
	type: TLArrowShapeArrowheadStyle
}

export function DashedArrowComponent({
	strokeWidth,
	dash,
	spline,
	start,
	end,
}: {
	dash: TLDefaultDashStyle
	strokeWidth: number
	spline: CubicSpline2d | Polyline2d
	start: TLArrowHeadModel
	end: TLArrowHeadModel
}) {
	const { segments } = spline

	return (
		<g stroke="currentColor" strokeWidth={strokeWidth}>
			{segments.map((segment, i) => (
				<Segment
					key={i}
					strokeWidth={strokeWidth}
					segment={segment}
					dash={dash}
					location={
						segments.length === 1
							? start && end
								? 'middle'
								: start
								? 'middle'
								: 'start'
							: i === 0
							? start
								? 'end'
								: 'start'
							: i === segments.length - 1
							? end
								? 'middle'
								: 'end'
							: 'middle'
					}
				/>
			))}
		</g>
	)
}

export function DashedArrowComponentSvg({
	strokeWidth,
	dash,
	spline,
	start,
	end,
	color,
}: {
	dash: TLDefaultDashStyle
	strokeWidth: number
	spline: CubicSpline2d | Polyline2d
	start: TLArrowHeadModel
	end: TLArrowHeadModel
	color: string
}) {
	const { segments } = spline

	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
	g.setAttribute('stroke', color)
	g.setAttribute('stroke-width', strokeWidth.toString())

	segments.forEach((segment, i) => {
		const segmentG = SegmentSvg({
			strokeWidth,
			segment,
			dash,
			location:
				segments.length === 1
					? start && end
						? 'middle'
						: start
						? 'middle'
						: 'start'
					: i === 0
					? start
						? 'end'
						: 'start'
					: i === segments.length - 1
					? end
						? 'middle'
						: 'end'
					: 'middle',
		})

		g.appendChild(segmentG)
	})

	return g
}
