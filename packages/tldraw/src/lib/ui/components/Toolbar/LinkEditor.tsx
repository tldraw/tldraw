import { Editor as TextEditor } from '@tiptap/core'
import { useEffect, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

const LINK_ICON =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' fill='none'%3E%3Cpath stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 5H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6M19 5h6m0 0v6m0-6L13 17'/%3E%3C/svg%3E"

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

	const handleVisitLink = () => {
		trackEvent('rich-text', { operation: 'link-visit', source })
		window.open(value, '_blank', 'noopener, noreferrer')
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
				className="tl-rich-text__toolbar-link-visit"
				title={msg('tool.rich-text-link-visit')}
				type="icon"
				onClick={handleVisitLink}
			>
				<div
					className="tl-hyperlink__icon"
					style={{
						mask: `url("${LINK_ICON}") center 100% / 100% no-repeat`,
						WebkitMask: `url("${LINK_ICON}") center 100% / 100% no-repeat`,
					}}
				/>
			</TldrawUiButton>
			<TldrawUiButton
				className="tl-rich-text__toolbar-link-remove"
				title={msg('tool.rich-text-link-remove')}
				type="icon"
				onClick={handleRemoveLink}
			>
				<TldrawUiButtonIcon small icon="trash" />
			</TldrawUiButton>
		</>
	)
}
