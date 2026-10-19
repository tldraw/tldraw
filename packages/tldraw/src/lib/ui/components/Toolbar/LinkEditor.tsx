import { defineMessages, openWindow, preventDefault, TiptapEditor, useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeLinkUrl } from '../../../utils/linkUrl'
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
	const [isInvalid, setIsInvalid] = useState(false)
	const msg = useTranslation()
	const ref = useRef<HTMLInputElement>(null)
	const trackEvent = useUiEvents()
	const source = 'rich-text-menu'
	const normalizedValue = normalizeLinkUrl(value)

	const handleRemoveLink = useCallback(() => {
		trackEvent('rich-text', { operation: 'link-remove', source })
		textEditor.chain().unsetLink().focus().run()
		onClose()
	}, [trackEvent, source, textEditor, onClose])

	const handleLinkComplete = useCallback(
		(link: string) => {
			const href = normalizeLinkUrl(link)
			// Leave the input open so the user can fix what they typed.
			if (href === null) {
				setIsInvalid(true)
				ref.current?.focus()
				return
			}
			if (href === '') {
				handleRemoveLink()
				return
			}

			trackEvent('rich-text', { operation: 'link-edit', source })
			textEditor.chain().setLink({ href }).run()
			// N.B. We shouldn't focus() on mobile because it causes the
			// Return key to replace the link with a newline :facepalm:
			if (editor.getInstanceState().isCoarsePointer) {
				textEditor.commands.blur()
			} else {
				textEditor.commands.focus()
			}
			onClose()
		},
		[trackEvent, source, textEditor, editor, onClose, handleRemoveLink]
	)

	const handleVisitLink = () => {
		trackEvent('rich-text', { operation: 'link-visit', source })
		if (normalizedValue) openWindow(normalizedValue, '_blank')
		onClose()
	}

	useEffect(() => {
		const doc = editor.getContainerDocument()
		const handlePointerDown = (e: PointerEvent) => {
			const toolbar = doc.querySelector('.tlui-rich-text__toolbar')
			if (toolbar?.contains(e.target as Node)) return
			// If the pointer down is not in the toolbar, complete the link
			if (normalizedValue === null) {
				onClose()
			} else {
				handleLinkComplete(value)
			}
		}
		doc.addEventListener('pointerdown', handlePointerDown, { capture: true })
		return () => {
			doc.removeEventListener('pointerdown', handlePointerDown, { capture: true })
		}
	}, [editor, handleLinkComplete, onClose, normalizedValue, value])

	useEffect(() => {
		ref.current?.focus()
	}, [value])

	useEffect(() => {
		setValue(initialValue)
		setIsInvalid(false)
	}, [initialValue])

	const handleValueChange = useCallback((nextValue: string) => {
		setValue(nextValue)
		setIsInvalid(false)
	}, [])

	return (
		<>
			<TldrawUiInput
				ref={ref}
				data-testid="rich-text.link-input"
				className={classNames('tlui-rich-text__toolbar-link-input', {
					'tlui-rich-text__toolbar-link-input--invalid': isInvalid,
				})}
				value={value}
				onValueChange={handleValueChange}
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
				disabled={!normalizedValue}
			>
				<TldrawUiButtonIcon small icon="external-link" />
			</TldrawUiButton>
			<TldrawUiButton
				className="tlui-rich-text__toolbar-link-remove"
				title={msg(messages.toolRichTextLinkRemove)}
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
