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

	return (
		<svg className={className ? classNames('tl-overlays__item', className) : className}>
			<path
				className="tl-scribble"
				d={getSvgPathFromStroke(scribble.points)}
				stroke={color ?? `var(--color-${scribble.color})`}
				strokeWidth={8 / zoom}
				opacity={opacity ?? scribble.opacity}
			/>
		</svg>
	)
}
