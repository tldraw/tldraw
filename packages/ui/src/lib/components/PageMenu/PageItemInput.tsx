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
	const app = useEditor()

	const rInput = useRef<HTMLInputElement | null>(null)

	const handleChange = useCallback(
		(value: string) => {
			app.renamePage(id, value ? value : 'New Page', true)
		},
		[app, id]
	)

	const handleComplete = useCallback(
		(value: string) => {
			app.mark('rename page')
			app.renamePage(id, value || 'New Page', false)
		},
		[app, id]
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
