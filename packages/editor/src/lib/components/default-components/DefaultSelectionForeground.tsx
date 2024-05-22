import { useValue } from '@tldraw/state'
import classNames from 'classnames'
import { useRef } from 'react'
import { useEditor } from '../../hooks/useEditor'
import { useTransform } from '../../hooks/useTransform'
import { Box } from '../../primitives/Box'
import { toDomPrecision } from '../../primitives/utils'

/** @public */
export interface TLSelectionForegroundProps {
	bounds: Box
	rotation: number
}

/** @public */
export function DefaultSelectionForeground({ bounds, rotation }: TLSelectionForegroundProps) {
	const editor = useEditor()
	const rSvg = useRef<SVGSVGElement>(null)

	const onlyShape = useValue('only selected shape', () => editor.getOnlySelectedShape(), [editor])

	// if all shapes have an expandBy for the selection outline, we can expand by the l
	const expandOutlineBy = onlyShape
		? editor.getShapeUtil(onlyShape).expandSelectionOutlinePx(onlyShape)
		: 0

	useTransform(rSvg, bounds?.x, bounds?.y, 1, rotation, {
		x: -expandOutlineBy,
		y: -expandOutlineBy,
	})

	bounds = bounds.clone().expandBy(expandOutlineBy).zeroFix()

	return (
		<svg
			ref={rSvg}
			className="tl-overlays__item tl-selection__fg"
			data-testid="selection-foreground"
		>
			<rect
				className={classNames('tl-selection__fg__outline')}
				width={toDomPrecision(bounds.width)}
				height={toDomPrecision(bounds.height)}
			/>
		</svg>
	)
}
