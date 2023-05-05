import { toDomPrecision } from '@tldraw/primitives'
import { Box2dModel } from '@tldraw/tlschema'
import { useRef } from 'react'
import { useTransform } from '../hooks/useTransform'

/** @public */
export type TLBrushComponent = (props: { brush: Box2dModel; color?: string }) => any | null

export const DefaultBrush: TLBrushComponent = ({ brush, color }) => {
	const rSvg = useRef<SVGSVGElement>(null)
	useTransform(rSvg, brush.x, brush.y)

	return (
		<svg className="tl-svg-origin-container" ref={rSvg}>
			{color ? (
				<g className="rs-brush">
					<rect
						width={toDomPrecision(Math.max(1, brush.w))}
						height={toDomPrecision(Math.max(1, brush.h))}
						fill={color}
						opacity={0.1}
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
					className="rs-brush rs-brush__default"
					width={toDomPrecision(Math.max(1, brush.w))}
					height={toDomPrecision(Math.max(1, brush.h))}
				/>
			)}
		</svg>
	)
}
