import { Vec2dModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { ComponentType, useRef } from 'react'
import { useTransform } from '../../hooks/useTransform'
import { Box2d } from '../../primitives/Box2d'
import { Vec2d } from '../../primitives/Vec2d'
import { clamp } from '../../primitives/utils'

/** @public */
export type TLCollaboratorHintComponent = ComponentType<{
	className?: string
	point: Vec2dModel
	viewport: Box2d
	zoom: number
	opacity?: number
	color: string
}>

/** @public */
export const DefaultCollaboratorHint: TLCollaboratorHintComponent = ({
	className,
	zoom,
	point,
	color,
	viewport,
	opacity = 1,
}) => {
	const rSvg = useRef<SVGSVGElement>(null)

	useTransform(
		rSvg,
		clamp(point.x, viewport.minX + 5 / zoom, viewport.maxX - 5 / zoom),
		clamp(point.y, viewport.minY + 5 / zoom, viewport.maxY - 5 / zoom),
		1 / zoom,
		Vec2d.Angle(viewport.center, point)
	)

	return (
		<svg ref={rSvg} className={classNames('tl-overlays__item', className)}>
			<use href="#cursor_hint" color={color} strokeWidth={3} stroke="var(--color-background)" />
			<use href="#cursor_hint" color={color} opacity={opacity} />
		</svg>
	)
}
