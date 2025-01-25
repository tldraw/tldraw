import { TLFrameShape, TLShapeId, useEditor, useIsEditing, useValue } from '@tldraw/editor'
import { useEffect, useRef } from 'react'
import { getFrameHeadingSide, getFrameHeadingTranslation } from '../frameHelpers'
import { FrameLabelInput } from './FrameLabelInput'

export function FrameHeading({
	id,
	name,
	width,
	height,
	fill,
	color,
}: {
	id: TLShapeId
	name: string
	width: number
	height: number
	fill: string
	color: string
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
				}px + var(--fow))`,
				bottom: '100%',
				transform: `${translation} scale(var(--tl-scale)) translateX(var(--fho))`,
			}}
		>
			<div className="tl-frame-heading-hit-area" style={{ color, backgroundColor: fill }}>
				<FrameLabelInput ref={rInput} id={id} name={name} isEditing={isEditing} />
			</div>
		</div>
	)
}
