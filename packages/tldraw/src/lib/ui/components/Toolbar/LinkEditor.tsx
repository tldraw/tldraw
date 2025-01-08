import { preventDefault, TiptapEditor } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

/** @public */
export interface LinkEditorProps {
	textEditor: TiptapEditor
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
	const linkifiedValue = value.startsWith('http') ? value : `https://${value}`

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
		window.open(linkifiedValue, '_blank', 'noopener, noreferrer')
		onComplete()
	}

	const handleRemoveLink = () => {
		trackEvent('rich-text', { operation: 'link-remove', source })
		textEditor.chain().unsetLink().focus().run()
		onComplete()
	}

	const handleLinkCancel = () => onComplete()

	useEffect(() => {
		if (!value) {
			ref.current?.focus()
		}
	}, [value])

	return (
		<>
			<TldrawUiInput
				ref={ref}
				data-testid="rich-text.link-input"
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
				onPointerDown={preventDefault}
				onClick={handleVisitLink}
				disabled={!value}
			>
				<TldrawUiButtonIcon small icon="external-link" />
			</TldrawUiButton>
			<TldrawUiButton
				className="tl-rich-text__toolbar-link-remove"
				title={msg('tool.rich-text-link-remove')}
				data-testid="rich-text.link-remove"
				type="icon"
				onPointerDown={preventDefault}
				onClick={handleRemoveLink}
			>
				<TldrawUiButtonIcon small icon="trash" />
			</TldrawUiButton>
		</>
	)
}
