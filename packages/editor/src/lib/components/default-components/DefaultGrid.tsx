import { modulate } from '@tldraw/utils'
import { GRID_STEPS } from '../../constants'

/** @public */
export interface TLGridProps {
	x: number
	y: number
	z: number
	size: number
}

/** @public */
export function DefaultGrid({ x, y, z, size }: TLGridProps) {
	return (
		<svg className="tl-grid" version="1.1" xmlns="http://www.w3.org/2000/svg">
			<defs>
				{GRID_STEPS.map(({ min, mid, step }, i) => {
					const s = step * size * z
					const xo = 0.5 + x * z
					const yo = 0.5 + y * z
					const gxo = xo > 0 ? xo % s : s + (xo % s)
					const gyo = yo > 0 ? yo % s : s + (yo % s)
					const opacity = z < mid ? modulate(z, [min, mid], [0, 1]) : 1

					return (
						<pattern
							key={`grid-pattern-${i}`}
							id={`grid-${step}`}
							width={s}
							height={s}
							patternUnits="userSpaceOnUse"
						>
							<circle className="tl-grid-dot" cx={gxo} cy={gyo} r={1} opacity={opacity} />
						</pattern>
					)
				})}
			</defs>
			{GRID_STEPS.map(({ step }, i) => (
				<rect key={`grid-rect-${i}`} width="100%" height="100%" fill={`url(#grid-${step})`} />
			))}
		</svg>
	)
}
