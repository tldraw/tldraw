import { VecModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { useRef } from 'react'
import { useSharedSafeId } from '../../hooks/useSafeId'
import { useTransform } from '../../hooks/useTransform'
import { Box } from '../../primitives/Box'
import { Vec } from '../../primitives/Vec'
import { clamp } from '../../primitives/utils'

/** @public */
export interface TLCollaboratorHintProps {
	userId: string
	className?: string
	point: VecModel
	viewport: Box
	zoom: number
	opacity?: number
	color: string
}

/** @public @react */
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
	const cursorHintId = useSharedSafeId('cursor_hint')

	return (
		<svg ref={rSvg} className={classNames('tl-overlays__item', className)} aria-hidden="true">
			<use
				href={`#${cursorHintId}`}
				color={color}
				strokeWidth={3}
				stroke="var(--tl-color-background)"
			/>
			<use href={`#${cursorHintId}`} color={color} opacity={opacity} />
		</svg>
	)
}
