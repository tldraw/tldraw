import { TLPageId, useEditor } from '@tldraw/editor'
import { useCallback, useRef } from 'react'
import { TldrawUiInput } from '../primitives/TldrawUiInput'
/** @public */
export const PageItemInput = function PageItemInput({
	name,
	id,
	isCurrentPage,
}: {
	name: string
	id: TLPageId
	isCurrentPage: boolean
}) {
	const editor = useEditor()

	const rInput = useRef<HTMLInputElement | null>(null)

	const handleFocus = useCallback(() => {
		editor.mark('rename page')
	}, [editor])

	const handleChange = useCallback(
		(value: string) => {
			editor.renamePage(id, value || 'New Page')
		},
		[editor, id]
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
