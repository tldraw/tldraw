import { track } from '@tldraw/state'
import classNames from 'classnames'
import { ComponentType, useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { useTransform } from '../../hooks/useTransform'
import { toDomPrecision } from '../../primitives/utils'

/** @public */
export type TLSelectionForegroundComponent = ComponentType<object>

export const DefaultSelectionForeground: TLSelectionForegroundComponent = track(() => {
	const editor = useEditor()
	const rSvg = useRef<SVGSVGElement>(null)

	let bounds = editor.selectionBounds

	const onlyShape = editor.onlySelectedShape

	// if all shapes have an expandBy for the selection outline, we can expand by the l
	const expandOutlineBy = onlyShape
		? editor.getShapeUtil(onlyShape).expandSelectionOutlinePx(onlyShape)
		: 0

	useTransform(rSvg, bounds?.x, bounds?.y, 1, editor.selectionRotation, {
		x: -expandOutlineBy,
		y: -expandOutlineBy,
	})

	if (!bounds) return null

	bounds = bounds.clone().expandBy(expandOutlineBy)

	const width = Math.max(1, bounds.width)
	const height = Math.max(1, bounds.height)

	return (
		<svg
			ref={rSvg}
			className="tl-overlays__item tl-selection__fg"
			data-testid="selection-foreground"
		>
			<rect
				className={classNames('tl-selection__fg__outline')}
				width={toDomPrecision(width)}
				height={toDomPrecision(height)}
			/>
		</svg>
	)
})
