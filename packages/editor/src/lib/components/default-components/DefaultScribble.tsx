import { TLScribble } from '@tldraw/tlschema'
import classNames from 'classnames'
import { getSvgPathFromPoints } from '../../utils/getSvgPathFromPoints'

/** @public */
export interface TLScribbleProps {
	userId?: string
	scribble: TLScribble
	zoom: number
	color?: string
	opacity?: number
	className?: string
}

/** @public @react */
export function DefaultScribble({ scribble, zoom, color, opacity, className }: TLScribbleProps) {
	if (!scribble.points.length) return null

	return (
		<svg className={className ? classNames('tl-overlays__item', className) : className}>
			<path
				className="tl-scribble"
				d={getSvgPathFromPoints(scribble.points, false)}
				stroke={color ?? `var(--tl-color-${scribble.color})`}
				fill="none"
				strokeWidth={8 / zoom}
				opacity={opacity ?? scribble.opacity}
			/>
		</svg>
	)
}
