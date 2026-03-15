import { useValue } from '@tldraw/state-react'
import classNames from 'classnames'
import { useEditor } from '../../hooks/useEditor'
import { setTransform } from '../../hooks/useTransform'
import { Box } from '../../primitives/Box'
import { toDomPrecision } from '../../primitives/utils'

/** @public */
export interface TLSelectionForegroundProps {
	bounds: Box
	rotation: number
}

/** @public @react */
export function DefaultSelectionForeground({ bounds, rotation }: TLSelectionForegroundProps) {
	const editor = useEditor()
	const onlyShape = useValue('only selected shape', () => editor.getOnlySelectedShape(), [editor])

	// if all shapes have an expandBy for the selection outline, we can expand by the l
	const expandOutlineBy = onlyShape
		? editor.getShapeUtil(onlyShape).expandSelectionOutlinePx(onlyShape)
		: 0

	bounds =
		expandOutlineBy instanceof Box
			? bounds.clone().expand(expandOutlineBy).zeroFix()
			: bounds.clone().expandBy(expandOutlineBy).zeroFix()

	return (
		<svg
			ref={(elm) =>
				setTransform(elm, bounds?.x, bounds?.y, 1, rotation, -expandOutlineBy, -expandOutlineBy)
			}
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
