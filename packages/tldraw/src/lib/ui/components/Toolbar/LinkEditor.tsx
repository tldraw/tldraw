import { defineMessages, openWindow, preventDefault, TiptapEditor, useEditor } from '@tldraw/editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiInput } from '../primitives/TldrawUiInput'

const messages = defineMessages({
	toolRichTextLinkRemove: { id: 'tool.rich-text-link-remove', defaultMessage: 'Remove link' },
	toolRichTextLinkVisit: { id: 'tool.rich-text-link-visit', defaultMessage: 'Visit link' },
})

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

	const handleLinkComplete = useCallback(
		(link: string, { refocus = true }: { refocus?: boolean } = {}) => {
			trackEvent('rich-text', { operation: 'link-edit', source })
			if (!link.startsWith('http://') && !link.startsWith('https://')) {
				link = `https://${link}`
			}

			textEditor.chain().setLink({ href: link }).run()
			// N.B. We shouldn't focus() on mobile because it causes the
			// Return key to replace the link with a newline :facepalm:
			if (editor.getInstanceState().isCoarsePointer) {
				textEditor.commands.blur()
			} else if (refocus) {
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

	const handleRemoveLink = useCallback(
		({ refocus = true }: { refocus?: boolean } = {}) => {
			trackEvent('rich-text', { operation: 'link-remove', source })
			const chain = textEditor.chain().unsetLink()
			if (refocus) chain.focus()
			chain.run()
			onClose()
		},
		[trackEvent, source, textEditor, onClose]
	)

	useEffect(() => {
		const doc = editor.getContainerDocument()
		const handlePointerDown = (e: PointerEvent) => {
			const toolbar = doc.querySelector('.tlui-rich-text__toolbar')
			if (toolbar?.contains(e.target as Node)) return
			// For a press inside the text, put the caret where it landed. Closing leaves the caret at
			// the link's start, and ProseMirror keeps that selection when the press refocuses the
			// text rather than reading where the browser put the caret; a refocus here would also
			// restore it a frame later.
			const caret = textEditor.view.dom.contains(e.target as Node)
				? textEditor.view.posAtCoords({ left: e.clientX, top: e.clientY })?.pos
				: undefined
			const refocus = caret === undefined
			if (value) {
				handleLinkComplete(value, { refocus })
			} else {
				handleRemoveLink({ refocus })
			}
			if (caret !== undefined) textEditor.commands.setTextSelection(caret)
		}
		doc.addEventListener('pointerdown', handlePointerDown, { capture: true })
		return () => {
			doc.removeEventListener('pointerdown', handlePointerDown, { capture: true })
		}
	}, [editor, textEditor, handleLinkComplete, handleRemoveLink, value])

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
				onValueChange={setValue}
				onComplete={handleLinkComplete}
				onCancel={onClose}
				placeholder="example.com"
				aria-label="example.com"
			/>
			<TldrawUiButton
				className="tlui-rich-text__toolbar-link-visit"
				title={msg(messages.toolRichTextLinkVisit)}
				type="icon"
				onPointerDown={preventDefault}
				onClick={handleVisitLink}
				disabled={!value}
			>
				<TldrawUiButtonIcon small icon="external-link" />
			</TldrawUiButton>
			<TldrawUiButton
				className="tlui-rich-text__toolbar-link-remove"
				title={msg(messages.toolRichTextLinkRemove)}
				data-testid="rich-text.link-remove"
				type="icon"
				onPointerDown={preventDefault}
				onClick={() => handleRemoveLink()}
			>
				<TldrawUiButtonIcon small icon="trash" />
			</TldrawUiButton>
		</>
	)
}
