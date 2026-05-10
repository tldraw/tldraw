import { TLPageId, useEditor } from '@tldraw/editor'
import { useCallback, useRef } from 'react'
import { useUiEvents } from '../../context/events'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

/** @public */
export interface PageItemInputProps {
	name: string
	id: TLPageId
	isCurrentPage: boolean
	onCancel(): void
	onComplete?(): void
}

/** @public @react */
export const PageItemInput = function PageItemInput({
	name,
	id,
	isCurrentPage,
	onCancel,
	onComplete,
}: PageItemInputProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()

	const rInput = useRef<HTMLInputElement | null>(null)
	const rMark = useRef<string | null>(null)

	const handleFocus = useCallback(() => {
		rMark.current = editor.markHistoryStoppingPoint('rename page')
	}, [editor])

	const handleChange = useCallback(
		(value: string) => {
			editor.renamePage(id, value || 'New Page')
			trackEvent('rename-page', { source: 'page-menu' })
		},
		[editor, id, trackEvent]
	)

	const handleCancel = useCallback(() => {
		if (rMark.current) {
			editor.bailToMark(rMark.current)
		}
		onCancel()
	}, [editor, onCancel])

	// `isCurrentPage` is retained for backwards compatibility but is no longer
	// used: mounting this input always indicates the user wants to rename, so
	// we always auto-focus regardless of whether the page is the current one.
	void isCurrentPage

	// Blur commits the rename (the value has been live-saved via onValueChange)
	// and exits editing, so clicking elsewhere closes the input.
	const handleBlur = useCallback(() => {
		onComplete?.()
	}, [onComplete])

	return (
		<TldrawUiInput
			className="tlui-page-menu__item__input"
			ref={(el) => {
				rInput.current = el
			}}
			defaultValue={name}
			onValueChange={handleChange}
			onComplete={onComplete}
			onCancel={handleCancel}
			onFocus={handleFocus}
			onBlur={handleBlur}
			shouldManuallyMaintainScrollPositionWhenFocused
			autoFocus
			autoSelect
		/>
	)
}
