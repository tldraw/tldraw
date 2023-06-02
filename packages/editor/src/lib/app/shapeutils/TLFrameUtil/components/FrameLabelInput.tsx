import { TLFrameShape, TLShapeId } from '@tldraw/tlschema'
import { forwardRef, useCallback } from 'react'
import { useEditor } from '../../../../hooks/useEditor'
import { defaultEmptyAs } from '../../../../utils/string'

export const FrameLabelInput = forwardRef<
	HTMLInputElement,
	{ id: TLShapeId; name: string; isEditing: boolean }
>(({ id, name, isEditing }, ref) => {
	const editor = useEditor()

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				// need to prevent the enter keydown making it's way up to the Idle state
				// and sending us back into edit mode
				e.stopPropagation()
				e.currentTarget.blur()
				editor.setEditingId(null)
			}
		},
		[editor]
	)

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			const shape = editor.getShapeById<TLFrameShape>(id)
			if (!shape) return

			const name = shape.props.name
			const value = e.currentTarget.value.trim()
			if (name === value) return

			editor.updateShapes(
				[
					{
						id,
						type: 'frame',
						props: { name: value },
					},
				],
				true
			)
		},
		[id, editor]
	)

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const shape = editor.getShapeById<TLFrameShape>(id)
			if (!shape) return

			const name = shape.props.name
			const value = e.currentTarget.value
			if (name === value) return

			editor.updateShapes(
				[
					{
						id,
						type: 'frame',
						props: { name: value },
					},
				],
				true
			)
		},
		[id, editor]
	)

	return (
		<div className={`tl-frame-label ${isEditing ? 'tl-frame-label__editing' : ''}`}>
			<input
				className="tl-frame-name-input"
				ref={ref}
				style={{ display: isEditing ? undefined : 'none' }}
				value={name}
				autoFocus
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				onChange={handleChange}
			/>
			{defaultEmptyAs(name, 'Frame') + String.fromCharCode(8203)}
		</div>
	)
})
