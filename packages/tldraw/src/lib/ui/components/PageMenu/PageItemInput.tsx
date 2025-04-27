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

	return (
		<TldrawUiInput
			className="tlui-page-menu__item__input"
			ref={(el) => (rInput.current = el)}
			defaultValue={name}
			onValueChange={handleChange}
			onComplete={onComplete}
			onCancel={handleCancel}
			onFocus={handleFocus}
			shouldManuallyMaintainScrollPositionWhenFocused
			autoFocus={isCurrentPage}
			autoSelect
		/>
	)
}
