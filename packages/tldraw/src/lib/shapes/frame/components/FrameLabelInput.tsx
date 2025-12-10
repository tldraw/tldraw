import { TLFrameShape, TLShapeId, useEditor, useValue } from '@tldraw/editor'
import { forwardRef, useCallback, useEffect, useRef } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../../ui/constants'
import { useBreakpoint } from '../../../ui/context/breakpoints'
import { useTranslation } from '../../../ui/hooks/useTranslation/useTranslation'
import { defaultEmptyAs } from '../FrameShapeUtil'

export const FrameLabelInput = forwardRef<
	HTMLInputElement,
	{ id: TLShapeId; name: string; isEditing: boolean }
>(({ id, name, isEditing }, ref) => {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const isCoarsePointer = useValue(
		'isCoarsePointer',
		() => editor.getInstanceState().isCoarsePointer,
		[editor]
	)
	const shouldUseWindowPrompt = breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM && isCoarsePointer
	const promptOpen = useRef<boolean>(false)
	const msg = useTranslation()

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
		(value: string) => {
			const shape = editor.getShape<TLFrameShape>(id)
			if (!shape) return

			const name = shape.props.name
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
		if (isEditing && shouldUseWindowPrompt && !promptOpen.current) {
			promptOpen.current = true
			const shape = editor.getShape<TLFrameShape>(id)
			const currentName = shape?.props.name ?? ''
			const newName = window.prompt(msg('action.rename'), currentName)
			promptOpen.current = false
			if (newName !== null) renameFrame(newName)
			editor.setEditingShape(null)
		}
	}, [isEditing, shouldUseWindowPrompt, id, msg, renameFrame, editor])

	return (
		<div
			className={`tl-frame-label ${isEditing && !shouldUseWindowPrompt ? 'tl-frame-label__editing' : ''}`}
		>
			<input
				className="tl-frame-name-input"
				ref={ref}
				disabled={!isEditing || shouldUseWindowPrompt}
				readOnly={!isEditing || shouldUseWindowPrompt}
				style={{ display: isEditing ? undefined : 'none' }}
				value={name}
				autoFocus={!shouldUseWindowPrompt}
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
