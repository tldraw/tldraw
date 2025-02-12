import { TLFrameShape, TLShapeId, useEditor, useIsEditing, useValue } from '@tldraw/editor'
import { memo, useEffect, useRef } from 'react'
import { getFrameHeadingSide, getFrameHeadingTranslation } from '../frameHelpers'
import { FrameLabelInput } from './FrameLabelInput'

export const FrameHeading = memo(function FrameHeading({
	id,
	name,
	width,
	height,
}: {
	id: TLShapeId
	name: string
	width: number
	height: number
}) {
	const editor = useEditor()
	const { side, translation } = useValue(
		'shape rotation',
		() => {
			const shape = editor.getShape<TLFrameShape>(id)
			if (!shape) {
				// meh
				return {
					side: 0,
					translation: 'translate(0, 0)',
				}
			}
			const labelSide = getFrameHeadingSide(editor, shape)
			return {
				side: labelSide,
				translation: getFrameHeadingTranslation(shape, labelSide, false),
			}
		},
		[editor, id]
	)

	const rInput = useRef<HTMLInputElement>(null)
	const isEditing = useIsEditing(id)

	useEffect(() => {
		const el = rInput.current
		if (el && isEditing) {
			// On iOS, we must focus here
			el.focus()
			el.select()
		}
	}, [rInput, isEditing])

	return (
		<div
			className="tl-frame-heading"
			style={{
				overflow: isEditing ? 'visible' : 'hidden',
				maxWidth: `calc(var(--tl-zoom) * ${
					side === 0 || side === 2 ? Math.ceil(width) : Math.ceil(height)
				}px + var(--space-5))`,
				bottom: '100%',
				transform: `${translation} scale(var(--tl-scale)) translateX(calc(-1 * var(--space-3))`,
			}}
		>
			<div className="tl-frame-heading-hit-area">
				<FrameLabelInput ref={rInput} id={id} name={name} isEditing={isEditing} />
			</div>
		</div>
	)
})
