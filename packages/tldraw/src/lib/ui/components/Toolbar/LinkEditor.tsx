import { Editor as TextEditor } from '@tiptap/core'
import { useEffect, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

export interface LinkEditorProps {
	textEditor: TextEditor
	value: string
	onComplete(): void
}

/** @public @react */
export function LinkEditor({ textEditor, value: initialValue, onComplete }: LinkEditorProps) {
	const [value, setValue] = useState(initialValue)
	const msg = useTranslation()
	const ref = useRef<HTMLInputElement>(null)
	const trackEvent = useUiEvents()
	const source = 'rich-text-menu'

	const handleValueChange = (value: string) => setValue(value)

	const handleLinkComplete = (link: string) => {
		trackEvent('rich-text', { operation: 'link-edit', source })
		if (!link.startsWith('http://') && !link.startsWith('https://')) {
			link = `https://${link}`
		}

		textEditor.chain().setLink({ href: link }).focus().run()
		onComplete()
	}

	const handleRemoveLink = () => {
		trackEvent('rich-text', { operation: 'link-remove', source })
		textEditor.chain().unsetLink().focus().run()
		onComplete()
	}

	const handleLinkCancel = () => onComplete()

	useEffect(() => {
		ref.current?.focus()
	}, [])

	return (
		<>
			<TldrawUiInput
				ref={ref}
				className="tl-rich-text__toolbar-link-input"
				value={value}
				onValueChange={handleValueChange}
				onComplete={handleLinkComplete}
				onCancel={handleLinkCancel}
			/>
			<TldrawUiButton
				className="tl-rich-text__toolbar-link-remove"
				title={msg('tool.rich-text-link-remove')}
				type="icon"
				onClick={handleRemoveLink}
			>
				<TldrawUiButtonIcon small icon="cross-2" />
			</TldrawUiButton>
		</>
	)
}
