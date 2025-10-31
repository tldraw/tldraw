import { TLFrameShape, TLShapeId, useEditor } from '@tldraw/editor'
import { forwardRef, useCallback, useEffect, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../../ui/constants'
import { useBreakpoint } from '../../../ui/context/breakpoints'
import { defaultEmptyAs } from '../FrameShapeUtil'

export const FrameLabelInput = forwardRef<
	HTMLInputElement,
	{ id: TLShapeId; name: string; isEditing: boolean }
>(({ id, name, isEditing }, ref) => {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const isMobile = breakpoint <= PORTRAIT_BREAKPOINT.MOBILE
	const promptOpen = useRef<boolean>(false)

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

	const renameFrame = useCallback(
		(value: string | undefined) => {
			if (!value) return

			const trimmed = value.trim()
			if (!trimmed) return

			const shape = editor.getShape<TLFrameShape>(id)
			if (!shape) return

			const name = shape.props.name
			if (name === trimmed) return

			editor.updateShapes([
				{
					id,
					type: 'frame',
					props: { name: trimmed },
				},
			])
		},
		[id, editor]
	)

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			renameFrame(e.currentTarget.value)
		},
		[renameFrame]
	)

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			renameFrame(e.currentTarget.value)
		},
		[renameFrame]
	)

	/* Mobile rename uses window.prompt */
	useEffect(() => {
		if (!isEditing) {
			promptOpen.current = false
			return
		}
		if (isEditing && isMobile && !promptOpen.current) {
			promptOpen.current = true
			const newname = window.prompt('Rename frame', name)
			if (!newname) {
				promptOpen.current = false
				editor.setEditingShape(null)
				return
			}
			renameFrame(newname)
		}
	}, [isEditing, isMobile, name, renameFrame, editor])

	return (
		<div className={`tl-frame-label ${isEditing && !isMobile ? 'tl-frame-label__editing' : ''}`}>
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
