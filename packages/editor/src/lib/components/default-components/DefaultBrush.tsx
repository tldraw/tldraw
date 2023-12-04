import { Box2dModel } from '@tldraw/tlschema'
import { ComponentType, useRef } from 'react'
import { useTransform } from '../../hooks/useTransform'
import { toDomPrecision } from '../../primitives/utils'

/** @public */
export type TLBrushComponent = ComponentType<{
	brush: Box2dModel
	color?: string
	opacity?: number
	className?: string
}>

/** @public */
export const DefaultBrush: TLBrushComponent = ({ brush, color, opacity, className }) => {
	const rSvg = useRef<SVGSVGElement>(null)
	useTransform(rSvg, brush.x, brush.y)

	const w = toDomPrecision(Math.max(1, brush.w))
	const h = toDomPrecision(Math.max(1, brush.h))

	return (
		<svg className="tl-overlays__item" ref={rSvg}>
			{color ? (
				<g className="tl-brush" opacity={opacity}>
					<rect width={w} height={h} fill={color} opacity={0.75} />
					<rect width={w} height={h} fill="none" stroke={color} opacity={0.1} />
				</g>
			) : (
				<rect className={`tl-brush tl-brush__default ${className}`} width={w} height={h} />
			)}
		</svg>
	)
}
