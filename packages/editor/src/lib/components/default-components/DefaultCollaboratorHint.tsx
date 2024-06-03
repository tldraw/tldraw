import { VecModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { useRef } from 'react'
import { useTransform } from '../../hooks/useTransform'
import { Box } from '../../primitives/Box'
import { Vec } from '../../primitives/Vec'
import { clamp } from '../../primitives/utils'

/** @public */
export interface TLCollaboratorHintProps {
	className?: string
	point: VecModel
	viewport: Box
	zoom: number
	opacity?: number
	color: string
}

/** @public */
export function DefaultCollaboratorHint({
	className,
	zoom,
	point,
	color,
	viewport,
	opacity = 1,
}: TLCollaboratorHintProps) {
	const rSvg = useRef<SVGSVGElement>(null)

	useTransform(
		rSvg,
		clamp(point.x, viewport.minX + 5 / zoom, viewport.maxX - 5 / zoom),
		clamp(point.y, viewport.minY + 5 / zoom, viewport.maxY - 5 / zoom),
		1 / zoom,
		Vec.Angle(viewport.center, point)
	)

	return (
		<svg ref={rSvg} className={classNames('tl-overlays__item', className)}>
			<use href="#cursor_hint" color={color} strokeWidth={3} stroke="var(--color-background)" />
			<use href="#cursor_hint" color={color} opacity={opacity} />
		</svg>
	)
}
