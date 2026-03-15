import { setTransform } from '../../hooks/useTransform'
import { Box } from '../../primitives/Box'
import { toDomPrecision } from '../../primitives/utils'

/** @public */
export interface TLSelectionBackgroundProps {
	bounds: Box
	rotation: number
}

/** @public @react */
export function DefaultSelectionBackground({ bounds, rotation }: TLSelectionBackgroundProps) {
	return (
		<div
			ref={(elm) => {
				setTransform(elm, bounds.x, bounds.y, 1, rotation)
				if (elm) {
					elm.style.width = toDomPrecision(Math.max(1, bounds.width)) + 'px'
					elm.style.height = toDomPrecision(Math.max(1, bounds.height)) + 'px'
				}
			}}
			className="tl-selection__bg"
			draggable={false}
		/>
	)
}
