import { T, TLRichText, TLShapePartial, track, useEditor } from '@tldraw/editor'
import { useCallback, useRef, useState } from 'react'
import { getFormattableSelectedShapes, setMarkOnRichText } from '../../utils/text/richText'
import { TLUiDialogProps } from '../context/dialogs'
import { useUiEvents } from '../context/events'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'
import { TldrawUiButtonLabel } from './primitives/Button/TldrawUiButtonLabel'
import {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from './primitives/TldrawUiDialog'
import { TldrawUiInput } from './primitives/TldrawUiInput'

// A url can either be invalid, or valid with a protocol, or valid without a protocol.
function validateUrl(url: string) {
	if (T.linkUrl.isValid(url)) {
		return { isValid: true, hasProtocol: true }
	}
	if (T.linkUrl.isValid('https://' + url)) {
		return { isValid: true, hasProtocol: false }
	}
	return { isValid: false, hasProtocol: false }
}

// Find the first link href already present in the rich text, so editing an existing link seeds the
// input with its current value.
function getFirstLinkHref(richText: TLRichText): string | undefined {
	let href: string | undefined
	const visit = (node: any) => {
		if (href !== undefined || !node || typeof node !== 'object') return
		if (Array.isArray(node.marks)) {
			const link = node.marks.find((mark: any) => mark?.type === 'link')
			if (link?.attrs?.href) {
				href = link.attrs.href
				return
			}
		}
		if (Array.isArray(node.content)) {
			for (const child of node.content) visit(child)
		}
	}
	visit(richText)
	return href
}

/**
 * A dialog for adding, editing, or removing a link on the text of the selected shapes, without
 * entering text edit mode. Applies a `link` mark to every text node of each selected shape.
 */
export const RichTextLinkDialog = track(function RichTextLinkDialog({ onClose }: TLUiDialogProps) {
	const editor = useEditor()
	const msg = useTranslation()
	const trackEvent = useUiEvents()

	const shapes = getFormattableSelectedShapes(editor)

	const rInput = useRef<HTMLInputElement>(null)
	const rInitialValue = useRef(
		shapes.map((shape) => getFirstLinkHref(shape.props.richText)).find(Boolean) ?? ''
	)

	const [urlInputState, setUrlInputState] = useState(() => {
		const initialValue = rInitialValue.current || 'https://'
		return { actual: initialValue, safe: initialValue, valid: true }
	})

	const handleChange = useCallback((rawValue: string) => {
		// Auto-correct a double https:// from a bad paste.
		const fixedRawValue = rawValue.replace(/https?:\/\/(https?:\/\/)/, (_match, arg1) => arg1)
		const urlValidResult = validateUrl(fixedRawValue)
		const safeValue =
			urlValidResult.isValid === true
				? urlValidResult.hasProtocol
					? fixedRawValue
					: 'https://' + fixedRawValue
				: 'https://'
		setUrlInputState({ actual: fixedRawValue, safe: safeValue, valid: urlValidResult.isValid })
	}, [])

	const handleComplete = useCallback(() => {
		const targets = getFormattableSelectedShapes(editor)
		if (targets.length === 0) {
			onClose()
			return
		}

		const href = urlInputState.safe
		trackEvent('rich-text', { operation: 'link-edit', source: 'kbd' })
		editor.markHistoryStoppingPoint('rich-text-link')
		editor.run(() => {
			editor.updateShapes(
				targets.map((shape) => ({
					id: shape.id,
					type: shape.type,
					props: { richText: setMarkOnRichText(shape.props.richText, 'link', true, { href }) },
				})) as TLShapePartial[]
			)
		})
		onClose()
	}, [editor, onClose, trackEvent, urlInputState])

	const handleClear = useCallback(() => {
		const targets = getFormattableSelectedShapes(editor)
		trackEvent('rich-text', { operation: 'link-remove', source: 'kbd' })
		editor.markHistoryStoppingPoint('rich-text-link-remove')
		editor.run(() => {
			editor.updateShapes(
				targets.map((shape) => ({
					id: shape.id,
					type: shape.type,
					props: { richText: setMarkOnRichText(shape.props.richText, 'link', false) },
				})) as TLShapePartial[]
			)
		})
		onClose()
	}, [editor, onClose, trackEvent])

	const handleCancel = useCallback(() => onClose(), [onClose])

	if (shapes.length === 0) {
		onClose()
		return null
	}

	// Are we going from an existing link to an empty/invalid one? Then offer to remove it.
	const isRemoving = !!rInitialValue.current && !urlInputState.valid

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>{msg('edit-link-dialog.title')}</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody>
				<div className="tlui-edit-link-dialog">
					<TldrawUiInput
						ref={rInput}
						className="tlui-edit-link-dialog__input"
						data-testid="rich-text-link-dialog.input"
						label="edit-link-dialog.url"
						autoFocus
						autoSelect
						placeholder="https://example.com"
						value={urlInputState.actual}
						onValueChange={handleChange}
						onComplete={handleComplete}
						onCancel={handleCancel}
					/>
					<div>
						{urlInputState.valid
							? msg('edit-link-dialog.detail')
							: msg('edit-link-dialog.invalid-url')}
					</div>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={handleCancel} onTouchEnd={handleCancel}>
					<TldrawUiButtonLabel>{msg('edit-link-dialog.cancel')}</TldrawUiButtonLabel>
				</TldrawUiButton>
				{isRemoving ? (
					<TldrawUiButton type="danger" onTouchEnd={handleClear} onClick={handleClear}>
						<TldrawUiButtonLabel>{msg('edit-link-dialog.clear')}</TldrawUiButtonLabel>
					</TldrawUiButton>
				) : (
					<TldrawUiButton
						type="primary"
						data-testid="rich-text-link-dialog.save"
						disabled={!urlInputState.valid}
						onTouchEnd={handleComplete}
						onClick={handleComplete}
					>
						<TldrawUiButtonLabel>{msg('edit-link-dialog.save')}</TldrawUiButtonLabel>
					</TldrawUiButton>
				)}
			</TldrawUiDialogFooter>
		</>
	)
})
