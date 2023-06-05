import { Box2d, clamp, Vec2d } from '@tldraw/primitives'
import { Vec2dModel } from '@tldraw/tlschema'
import classNames from 'classnames'
import { useEffect, useRef, useState } from 'react'
import { useEditor } from '../hooks/useEditor'
import { useTransform } from '../hooks/useTransform'
import { DEFAULT_COLLABORATOR_TIMEOUT } from './LiveCollaborators'

export type TLCollaboratorHintComponent = (props: {
	className?: string
	point: Vec2dModel
	viewport: Box2d
	zoom: number
	opacity?: number
	color: string
	lastActivityTimestamp: number
	userId: string
}) => JSX.Element | null

export const DefaultCollaboratorHint: TLCollaboratorHintComponent = ({
	className,
	zoom,
	point,
	color,
	viewport,
	opacity = 1,
	lastActivityTimestamp,
	userId,
}) => {
	const editor = useEditor()
	const rSvg = useRef<SVGSVGElement>(null)

	useTransform(
		rSvg,
		clamp(point.x, viewport.minX + 5 / zoom, viewport.maxX - 5 / zoom),
		clamp(point.y, viewport.minY + 5 / zoom, viewport.maxY - 5 / zoom),
		1 / zoom,
		Vec2d.Angle(viewport.center, point)
	)

	const [isTimedOut, setIsTimedOut] = useState(false)

	useEffect(() => {
		// By default, show the cursor
		setIsTimedOut(false)

		// After a few seconds of inactivity, hide the cursor
		const timeout = setTimeout(() => {
			setIsTimedOut(true)
		}, DEFAULT_COLLABORATOR_TIMEOUT)

		return () => clearTimeout(timeout)
	}, [lastActivityTimestamp])

	if (isTimedOut && editor.instanceState.followingUserId !== userId) return null

	return (
		<svg ref={rSvg} className={classNames('tl-overlays__item', className)}>
			<use href="#cursor_hint" color={color} strokeWidth={3} stroke="var(--color-background)" />
			<use href="#cursor_hint" color={color} opacity={opacity} />
		</svg>
	)
}
