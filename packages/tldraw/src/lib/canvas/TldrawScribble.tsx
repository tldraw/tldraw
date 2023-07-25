import { EASINGS, TLScribbleComponent, getSvgPathFromPoints } from '@tldraw/editor'
import classNames from 'classnames'
import { getStroke } from '../shapes/shared/freehand/getStroke'

export const TldrawScribble: TLScribbleComponent = ({
	scribble,
	zoom,
	color,
	opacity,
	className,
}) => {
	if (!scribble.points.length) return null

	const stroke = getStroke(scribble.points, {
		size: scribble.size / zoom,
		start: { taper: true, easing: EASINGS.linear },
		last: scribble.state === 'stopping',
		simulatePressure: false,
		streamline: 0.32,
	})

	let d: string

	if (stroke.length < 4) {
		// the stroke will be 3 points as a sort of shrugging fail state, so let's draw a dot instead
		const r = scribble.size / zoom / 2
		const { x, y } = scribble.points[scribble.points.length - 1]
		d = `M ${x - r},${y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`
	} else {
		// If we do have a stroke, then draw the stroke path
		d = getSvgPathFromPoints(stroke)
	}

	return (
		<svg className={className ? classNames('tl-overlays__item', className) : className}>
			<path
				className="tl-scribble"
				d={d}
				fill={color ?? `var(--color-${scribble.color})`}
				opacity={opacity ?? scribble.opacity}
			/>
		</svg>
	)
}
