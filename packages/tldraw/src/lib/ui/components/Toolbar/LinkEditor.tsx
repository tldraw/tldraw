import { openWindow, preventDefault, TiptapEditor, useEditor } from '@tldraw/editor'
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
	onClose(): void
}

/** @public @react */
export function LinkEditor({ textEditor, value: initialValue, onClose }: LinkEditorProps) {
	const editor = useEditor()
	const [value, setValue] = useState(initialValue)
	const msg = useTranslation()
	const ref = useRef<HTMLInputElement>(null)
	const trackEvent = useUiEvents()
	// Guard against double-saves: Enter triggers both blur and onComplete,
	// and Escape should cancel without saving on subsequent blur.
	const didCompleteRef = useRef(false)
	const source = 'rich-text-menu'
	const linkifiedValue = value.startsWith('http') ? value : `https://${value}`

	const handleValueChange = (value: string) => setValue(value)

	const handleLinkComplete = (link: string) => {
		if (didCompleteRef.current) return
		didCompleteRef.current = true
		trackEvent('rich-text', { operation: 'link-edit', source })
		if (!link.startsWith('http://') && !link.startsWith('https://')) {
			link = `https://${link}`
		}

		textEditor.chain().setLink({ href: link }).run()
		// N.B. We shouldn't focus() on mobile because it causes the
		// Return key to replace the link with a newline :facepalm:
		if (editor.getInstanceState().isCoarsePointer) {
			textEditor.commands.blur()
		} else {
			textEditor.commands.focus()
		}
		onClose()
	}

	const handleVisitLink = () => {
		trackEvent('rich-text', { operation: 'link-visit', source })
		openWindow(linkifiedValue, '_blank')
		onClose()
	}

	const handleRemoveLink = () => {
		trackEvent('rich-text', { operation: 'link-remove', source })
		textEditor.chain().unsetLink().focus().run()
		onClose()
	}

	const handleLinkCancel = () => {
		didCompleteRef.current = true
		onClose()
	}

	const handleBlur = (blurValue: string) => {
		if (didCompleteRef.current) return
		handleLinkComplete(blurValue)
	}

	useEffect(() => {
		ref.current?.focus()
	}, [value])

	useEffect(() => {
		setValue(initialValue)
	}, [initialValue])

	return (
		<>
			<TldrawUiInput
				ref={ref}
				data-testid="rich-text.link-input"
				className="tlui-rich-text__toolbar-link-input"
				value={value}
				onValueChange={handleValueChange}
				onComplete={handleLinkComplete}
				onCancel={handleLinkCancel}
				onBlur={handleBlur}
				placeholder="example.com"
				aria-label="example.com"
			/>
			<TldrawUiButton
				className="tlui-rich-text__toolbar-link-visit"
				title={msg('tool.rich-text-link-visit')}
				type="icon"
				onPointerDown={preventDefault}
				onClick={handleVisitLink}
				disabled={!value}
			>
				<TldrawUiButtonIcon small icon="external-link" />
			</TldrawUiButton>
			<TldrawUiButton
				className="tlui-rich-text__toolbar-link-remove"
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
