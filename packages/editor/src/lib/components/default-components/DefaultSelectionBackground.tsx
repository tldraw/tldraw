import * as React from 'react'
import { useTransform } from '../../hooks/useTransform'
import { Box2d } from '../../primitives/Box2d'
import { toDomPrecision } from '../../primitives/utils'

/** @public */
export type TLSelectionBackgroundComponent = React.ComponentType<{
	bounds: Box2d
	rotation: number
}>

/** @public */
export const DefaultSelectionBackground: TLSelectionBackgroundComponent = ({
	bounds,
	rotation,
}) => {
	const rDiv = React.useRef<HTMLDivElement>(null)
	useTransform(rDiv, bounds.x, bounds.y, 1, rotation)

	React.useLayoutEffect(() => {
		const div = rDiv.current
		if (!div) return
		div.style.width = toDomPrecision(Math.max(1, bounds.width)) + 'px'
		div.style.height = toDomPrecision(Math.max(1, bounds.height)) + 'px'
	}, [bounds.width, bounds.height])

	return <div ref={rDiv} className="tl-selection__bg" draggable={false} />
}
