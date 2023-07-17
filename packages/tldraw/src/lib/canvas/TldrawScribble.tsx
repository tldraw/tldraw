import { EASINGS, TLScribble, getSvgPathFromPoints } from '@tldraw/editor'
import classNames from 'classnames'
import { getStroke } from '../shapes/shared/freehand/getStroke'

/** @public */
export type TLScribbleComponent = (props: {
	scribble: TLScribble
	zoom: number
	color?: string
	opacity?: number
	className?: string
}) => any

export const TldrawScribble: TLScribbleComponent = ({
	scribble,
	zoom,
	color,
	opacity,
	className,
}) => {
	if (!scribble.points.length) return

	const d = getSvgPathFromPoints(
		getStroke(scribble.points, {
			size: scribble.size / zoom,
			start: { taper: true, easing: EASINGS.linear },
			last: scribble.state === 'stopping',
			simulatePressure: false,
			streamline: 0.32,
		})
	)

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
