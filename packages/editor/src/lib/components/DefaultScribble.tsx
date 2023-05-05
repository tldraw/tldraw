import { EASINGS, getStroke } from '@tldraw/primitives'
import { TLScribble } from '@tldraw/tlschema'
import { getSvgPathFromStroke } from '../utils/svg'

/** @public */
export type TLScribbleComponent = (props: {
	scribble: TLScribble
	zoom: number
	color?: string
	opacity?: number
}) => any

export const DefaultScribble: TLScribbleComponent = ({ scribble, zoom, color, opacity }) => {
	const d = getSvgPathFromStroke(
		getStroke(scribble.points, {
			size: scribble.size / zoom,
			start: { taper: true, easing: EASINGS.linear },
			last: scribble.state === 'stopping',
			simulatePressure: false,
		})
	)

	return (
		<svg className="tl-svg-origin-container">
			<path
				className="tl-scribble"
				d={d}
				fill={color ?? `var(--color-${scribble.color})`}
				opacity={opacity ?? scribble.opacity}
			/>
		</svg>
	)
}
