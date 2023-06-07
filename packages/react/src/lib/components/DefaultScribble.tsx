import { EASINGS, getStroke } from '@tldraw/primitives'
import { TLScribble } from '@tldraw/tlschema'
import classNames from 'classnames'
import { getSvgPathFromStroke } from '../utils/svg'

/** @public */
export type TLScribbleComponent = (props: {
	scribble: TLScribble
	zoom: number
	color?: string
	opacity?: number
	className?: string
}) => any

export const DefaultScribble: TLScribbleComponent = ({
	scribble,
	zoom,
	color,
	opacity,
	className,
}) => {
	if (!scribble.points.length) return

	const d = getSvgPathFromStroke(
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
