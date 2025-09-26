import { TLFrameShape, TLShapeId, useEditor } from '@tldraw/editor'
import { forwardRef, useCallback, useEffect } from 'react'
import { defaultEmptyAs } from '../FrameShapeUtil'
import { useBreakpoint } from '../../../ui/context/breakpoints'
import { PORTRAIT_BREAKPOINT } from '../../../ui/constants'

export const FrameLabelInput = forwardRef<
	HTMLInputElement,
	{ id: TLShapeId; name: string; isEditing: boolean; }
>(({ id, name, isEditing }, ref) => {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
  	const isMobile = breakpoint <= PORTRAIT_BREAKPOINT.MOBILE

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (isEditing) editor.markEventAsHandled(e)
		},
		[editor, isEditing]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
				// need to prevent the enter keydown making it's way up to the Idle state
				// and sending us back into edit mode
				editor.markEventAsHandled(e)
				e.currentTarget.blur()
				editor.setEditingShape(null)
			}
		},
		[editor]
	)

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			const shape = editor.getShape<TLFrameShape>(id)
			if (!shape) return

			const name = shape.props.name
			const value = e.currentTarget.value.trim()
			if (name === value) return

			editor.updateShapes([
				{
					id,
					type: 'frame',
					props: { name: value },
				},
			])
		},
		[id, editor]
	)

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const shape = editor.getShape<TLFrameShape>(id)
			if (!shape) return

			const name = shape.props.name
			const value = e.currentTarget.value
			if (name === value) return

			editor.updateShapes([
				{
					id,
					type: 'frame',
					props: { name: value },
				},
			])
		},
		[id, editor]
	)

	/* Actual Rename */
	const renameFrame = useCallback(
		(newname: string) => {
			const shape = editor.getShape<TLFrameShape>(id)
			if (!shape) return

			const name = shape.props.name
			if (name === newname) return

			editor.updateShapes([
				{
					id,
					type: 'frame',
					props: { name: newname },
				},
			])
		},
		[id, editor]
	)

	/* Mobile rename uses window.prompt */
	useEffect(() => {
		if (isEditing && isMobile) {
			const newname = window.prompt('Rename frame', name)
			if (newname) {
				renameFrame(newname)
			}
		}
	}, [isEditing, isMobile, name, renameFrame])

	return (
		<div className={`tl-frame-label ${(isEditing && !isMobile) ? 'tl-frame-label__editing' : ''}`}>
			<input
				className="tl-frame-name-input"
				ref={ref}
				disabled={!isEditing || isMobile}
				readOnly={!isEditing && !isMobile}
				style={{ display: isEditing ? undefined : 'none' }}
				value={name}
				autoFocus={!isMobile}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				onChange={handleChange}
				onPointerDown={handlePointerDown}
				draggable={false}
			/>
			{defaultEmptyAs(name, 'Frame') + String.fromCharCode(8203)}
		</div>
	)
})
