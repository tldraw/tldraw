import { track, useValue } from '@tldraw/state-react'
import { TLArrowShape } from '@tldraw/tlschema'
import { assertExists } from '@tldraw/utils'
import classNames from 'classnames'
import { Fragment } from 'react'
import { getElbowArrowTargetHandlesInPageSpace } from '../../arrows/target'
import { useEditor } from '../../hooks/useEditor'
export const DefaultArrowHints = track(function DefaultArrowHints() {
	const editor = useEditor()

	const arrowHints = useValue('arrow hints', () => editor.getCurrentPageState().arrowHints, [
		editor,
	])

	if (!arrowHints) return null

	const { handlePointsInPageSpace } = getElbowArrowTargetHandlesInPageSpace(
		editor,
		arrowHints.arrowShapeId
			? assertExists(editor.getShape<TLArrowShape>(arrowHints.arrowShapeId))
			: null,
		assertExists(editor.getShape(arrowHints.targetShapeId))
	)

	return (
		<svg className="tl-user-arrow-hints tl-overlays__item">
			{Object.entries(handlePointsInPageSpace).map(([side, point]) => {
				if (!point) return null
				return (
					<Fragment key={side}>
						{side === arrowHints.hoverSide && (
							<circle
								cx={point.x}
								cy={point.y}
								className={classNames('tl-arrow-hint-handle__active')}
							/>
						)}
						<circle cx={point.x} cy={point.y} className={classNames('tl-arrow-hint-handle')} />
					</Fragment>
				)
			})}
		</svg>
	)
})
