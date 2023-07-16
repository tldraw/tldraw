import { TLScribble } from '@tldraw/tlschema'
import classNames from 'classnames'
import { getSvgPathFromPoints } from '../utils/getSvgPathFromPoints'

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

	return (
		<svg className={className ? classNames('tl-overlays__item', className) : className}>
			<path
				className="tl-scribble"
				d={getSvgPathFromPoints(scribble.points, false)}
				stroke={color ?? `var(--color-${scribble.color})`}
				fill="none"
				strokeWidth={8 / zoom}
				opacity={opacity ?? scribble.opacity}
			/>
		</svg>
	)
}
