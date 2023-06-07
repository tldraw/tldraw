import { toDomPrecision } from '@tldraw/primitives'
import { Box2dModel } from '@tldraw/tlschema'
import { useRef } from 'react'
import { useTransform } from '../hooks/useTransform'

/** @public */
export type TLBrushComponent = (props: {
	brush: Box2dModel
	color?: string
	opacity?: number
	className?: string
}) => any | null

export const DefaultBrush: TLBrushComponent = ({ brush, color, opacity }) => {
	const rSvg = useRef<SVGSVGElement>(null)
	useTransform(rSvg, brush.x, brush.y)

	return (
		<svg className="tl-overlays__item" ref={rSvg}>
			{color ? (
				<g className="tl-brush" opacity={opacity}>
					<rect
						width={toDomPrecision(Math.max(1, brush.w))}
						height={toDomPrecision(Math.max(1, brush.h))}
						fill={color}
						opacity={0.75}
					/>
					<rect
						width={toDomPrecision(Math.max(1, brush.w))}
						height={toDomPrecision(Math.max(1, brush.h))}
						fill="none"
						stroke={color}
						opacity={0.1}
					/>
				</g>
			) : (
				<rect
					className="tl-brush tl-brush__default"
					width={toDomPrecision(Math.max(1, brush.w))}
					height={toDomPrecision(Math.max(1, brush.h))}
				/>
			)}
		</svg>
	)
}
