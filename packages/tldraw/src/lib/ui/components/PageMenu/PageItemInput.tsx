import { TLPageId, useEditor } from '@tldraw/editor'
import { useCallback, useRef } from 'react'
import { useUiEvents } from '../../context/events'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

/** @public */
export interface PageItemInputProps {
	name: string
	id: TLPageId
	isCurrentPage: boolean
}

/** @public @react */
export const PageItemInput = function PageItemInput({
	name,
	id,
	isCurrentPage,
}: PageItemInputProps) {
	const editor = useEditor()
	const trackEvent = useUiEvents()

	const rInput = useRef<HTMLInputElement | null>(null)

	const handleFocus = useCallback(() => {
		editor.mark('rename page')
	}, [editor])

	const handleChange = useCallback(
		(value: string) => {
			editor.renamePage(id, value || 'New Page')
			trackEvent('rename-page', { source: 'page-menu' })
		},
		[editor, id, trackEvent]
	)

	return (
		<TldrawUiInput
			className="tlui-page-menu__item__input"
			ref={(el) => (rInput.current = el)}
			defaultValue={name}
			onValueChange={handleChange}
			onFocus={handleFocus}
			shouldManuallyMaintainScrollPositionWhenFocused
			autoFocus={isCurrentPage}
			autoSelect
		/>
	)
}
