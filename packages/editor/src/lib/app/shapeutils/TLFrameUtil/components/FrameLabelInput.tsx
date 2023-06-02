import { TLFrameShape, TLShapeId } from '@tldraw/tlschema'
import { forwardRef, useCallback } from 'react'
import { useEditor } from '../../../../hooks/useEditor'
import { defaultEmptyAs } from '../../../../utils/string'

export const FrameLabelInput = forwardRef<
	HTMLInputElement,
	{ id: TLShapeId; name: string; isEditing: boolean }
>(({ id, name, isEditing }, ref) => {
	const app = useEditor()

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				// need to prevent the enter keydown making it's way up to the Idle state
				// and sending us back into edit mode
				e.stopPropagation()
				e.currentTarget.blur()
				app.setEditingId(null)
			}
		},
		[app]
	)

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			const shape = app.getShapeById<TLFrameShape>(id)
			if (!shape) return

			const name = shape.props.name
			const value = e.currentTarget.value.trim()
			if (name === value) return

			app.updateShapes(
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
		[id, app]
	)

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const shape = app.getShapeById<TLFrameShape>(id)
			if (!shape) return

			const name = shape.props.name
			const value = e.currentTarget.value
			if (name === value) return

			app.updateShapes(
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
		[id, app]
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
