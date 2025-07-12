import { modulate } from '@tldraw/utils'
import { useEditor } from '../../hooks/useEditor'
import { suffixSafeId, useUniqueSafeId } from '../../hooks/useSafeId'

/** @public */
export interface TLGridProps {
	x: number
	y: number
	z: number
	size: number
}

/** @public @react */
export function DefaultGrid({ x, y, z, size }: TLGridProps) {
	const id = useUniqueSafeId('grid')
	const editor = useEditor()
	const { gridSteps } = editor.options
	return (
		<svg className="tl-grid" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<defs>
				{gridSteps.map(({ min, mid, step }, i) => {
					const s = step * size * z
					const xo = 0.5 + x * z
					const yo = 0.5 + y * z
					const gxo = xo > 0 ? xo % s : s + (xo % s)
					const gyo = yo > 0 ? yo % s : s + (yo % s)
					const opacity = z < mid ? modulate(z, [min, mid], [0, 1]) : 1

					return (
						<pattern
							key={i}
							id={suffixSafeId(id, `${step}`)}
							width={s}
							height={s}
							patternUnits="userSpaceOnUse"
						>
							<circle className="tl-grid-dot" cx={gxo} cy={gyo} r={1} opacity={opacity} />
						</pattern>
					)
				})}
			</defs>
			{gridSteps.map(({ step }, i) => (
				<rect key={i} width="100%" height="100%" fill={`url(#${id}_${step})`} />
			))}
		</svg>
	)
}
