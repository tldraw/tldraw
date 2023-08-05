import { TLPageId, useEditor } from '@tldraw/editor'
import { useCallback, useRef } from 'react'
import { Input } from '../primitives/Input'

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

	const handleChange = useCallback(
		(value: string) => {
			editor.renamePage(id, value ? value : 'New Page', { ephemeral: true })
		},
		[editor, id]
	)

	const handleComplete = useCallback(
		(value: string) => {
			editor.mark('rename page')
			editor.renamePage(id, value || 'New Page', { ephemeral: false })
		},
		[editor, id]
	)

	return (
		<Input
			className="tlui-page-menu__item__input"
			ref={(el) => (rInput.current = el)}
			defaultValue={name}
			onValueChange={handleChange}
			onComplete={handleComplete}
			onCancel={handleComplete}
			shouldManuallyMaintainScrollPositionWhenFocused
			autofocus={isCurrentPage}
			autoselect
		/>
	)
}
