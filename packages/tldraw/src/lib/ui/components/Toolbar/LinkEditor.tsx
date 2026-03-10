import { openWindow, preventDefault, TiptapEditor, useEditor } from '@tldraw/editor'
import { useCallback, useEffect, useRef, useState } from 'react'
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
	const source = 'rich-text-menu'
	const linkifiedValue = value.startsWith('http') ? value : `https://${value}`

	const handleValueChange = (value: string) => setValue(value)

	const handleLinkComplete = useCallback(
		(link: string) => {
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
		},
		[trackEvent, source, textEditor, editor, onClose]
	)

	const handleVisitLink = () => {
		trackEvent('rich-text', { operation: 'link-visit', source })
		openWindow(linkifiedValue, '_blank')
		onClose()
	}

	const handleRemoveLink = useCallback(() => {
		trackEvent('rich-text', { operation: 'link-remove', source })
		textEditor.chain().unsetLink().focus().run()
		onClose()
	}, [trackEvent, source, textEditor, onClose])

	const handleLinkCancel = () => onClose()

	useEffect(() => {
		const handlePointerDown = (e: PointerEvent) => {
			const toolbar = document.querySelector('.tlui-rich-text__toolbar')
			if (toolbar?.contains(e.target as Node)) return
			// If the pointer down is not in the toolbar, complete the link
			if (value) {
				handleLinkComplete(value)
			} else {
				handleRemoveLink()
			}
		}
		document.addEventListener('pointerdown', handlePointerDown, { capture: true })
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
		}
	}, [handleLinkComplete, handleRemoveLink, value])

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
