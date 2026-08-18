import { TLFrameShape, TLShapeId, useEditor, useIsEditing, useValue } from '@tldraw/editor'
import { memo, useEffect, useRef } from 'react'
import { getFrameHeadingSide, getFrameHeadingTranslation } from '../frameHelpers'
import { FrameLabelInput } from './FrameLabelInput'

export const FrameHeading = memo(function FrameHeading({
	id,
	name,
	width,
	height,
	fill,
	stroke,
	color,
	offsetX,
	showColors,
}: {
	id: TLShapeId
	name: string
	width: number
	height: number
	fill: string
	stroke: string
	color: string
	offsetX: number
	showColors: boolean
}) {
	const editor = useEditor()
	const { side, translation } = useValue(
		'shape rotation',
		() => {
			const shape = editor.getShape<TLFrameShape>(id)
			if (!shape) return { side: 0, translation: 'translate(0, 0)' }
			const side = getFrameHeadingSide(editor, shape)
			return { side, translation: getFrameHeadingTranslation(shape, side, false) }
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
	}, [isEditing])

	return (
		<div
			className="tl-frame-heading"
			style={{
				overflow: isEditing ? 'visible' : 'hidden',
				maxWidth: `calc(var(--tl-zoom) * ${Math.ceil(side % 2 === 0 ? width : height)}px + ${showColors ? '0px' : 'var(--tl-frame-offset-width)'})`,
				bottom: '100%',
				transform: `${translation} scale(min(var(--tl-scale), 3.5)) translateX(${offsetX}px)`,
			}}
		>
			<div
				className="tl-frame-heading-hit-area"
				style={{ color, backgroundColor: fill, boxShadow: `inset 0px 0px 0px 1px ${stroke}` }}
			>
				<FrameLabelInput ref={rInput} id={id} name={name} isEditing={isEditing} />
			</div>
		</div>
	)
})
