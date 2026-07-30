import {
	ExtractShapeByProps,
	T,
	TLRichText,
	TLShape,
	TLShapePartial,
	track,
	useEditor,
} from '@tldraw/editor'
import { useCallback, useEffect, useRef, useState } from 'react'
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
// For example, "aol.com" would be valid with a protocol ()
function validateUrl(url: string) {
	if (T.linkUrl.isValid(url)) {
		return { isValid: true, hasProtocol: true }
	}
	if (T.linkUrl.isValid('https://' + url)) {
		return { isValid: true, hasProtocol: false }
	}
	return { isValid: false, hasProtocol: false }
}

type ShapeWithUrl = ExtractShapeByProps<{ url: string }>

function isShapeWithUrl(shape: TLShape | null | undefined): shape is ShapeWithUrl {
	return !!(shape && 'url' in shape.props && typeof shape.props.url === 'string')
}

function assertShapeWithUrl(shape: TLShape | null | undefined): asserts shape is ShapeWithUrl {
	if (!isShapeWithUrl(shape)) {
		throw new Error('Shape is not a valid ShapeWithUrl')
	}
}

// The shared link-editing dialog UI: a validated url input with save / clear / cancel. The wrappers
// below decide where the link value comes from and where it gets written.
const LinkDialog = track(function LinkDialog({
	onClose,
	initialValue,
	onComplete,
	onClear,
}: TLUiDialogProps & {
	initialValue: string
	onComplete(url: string): void
	onClear(): void
}) {
	const editor = useEditor()
	const msg = useTranslation()

	const rInput = useRef<HTMLInputElement>(null)

	useEffect(() => {
		editor.timers.requestAnimationFrame(() => rInput.current?.focus())
	}, [editor])

	const rInitialValue = useRef(initialValue)

	const [urlInputState, setUrlInputState] = useState(() => {
		const urlValidResult = validateUrl(initialValue)

		const value =
			urlValidResult.isValid === true
				? urlValidResult.hasProtocol
					? initialValue
					: 'https://' + initialValue
				: 'https://'

		return {
			actual: value,
			safe: value,
			valid: true,
		}
	})

	const handleChange = useCallback((rawValue: string) => {
		// Just auto-correct double https:// from a bad paste.
		const fixedRawValue = rawValue.replace(/https?:\/\/(https?:\/\/)/, (_match, arg1) => {
			return arg1
		})

		const urlValidResult = validateUrl(fixedRawValue)

		const safeValue =
			urlValidResult.isValid === true
				? urlValidResult.hasProtocol
					? fixedRawValue
					: 'https://' + fixedRawValue
				: 'https://'

		setUrlInputState({
			actual: fixedRawValue,
			safe: safeValue,
			valid: urlValidResult.isValid,
		})
	}, [])

	const handleClear = useCallback(() => {
		onClear()
		onClose()
	}, [onClear, onClose])

	const handleComplete = useCallback(() => {
		onComplete(urlInputState.safe)
		onClose()
	}, [onComplete, onClose, urlInputState])

	const handleCancel = useCallback(() => {
		onClose()
	}, [onClose])

	// Are we going from a valid state to an invalid state?
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
						data-testid="edit-link-dialog.input"
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
					<TldrawUiButton type={'danger'} onTouchEnd={handleClear} onClick={handleClear}>
						<TldrawUiButtonLabel>{msg('edit-link-dialog.clear')}</TldrawUiButtonLabel>
					</TldrawUiButton>
				) : (
					<TldrawUiButton
						type="primary"
						data-testid="edit-link-dialog.save"
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

export const EditLinkDialog = track(function EditLinkDialog({ onClose }: TLUiDialogProps) {
	const editor = useEditor()

	const selectedShape = editor.getOnlySelectedShape()

	if (!isShapeWithUrl(selectedShape)) {
		return null
	}

	return <EditLinkDialogInner onClose={onClose} selectedShape={selectedShape} />
})

export const EditLinkDialogInner = track(function EditLinkDialogInner({
	onClose,
	selectedShape,
}: TLUiDialogProps & { selectedShape: ShapeWithUrl }) {
	const editor = useEditor()

	const handleComplete = useCallback(
		(url: string) => {
			const onlySelectedShape = editor.getOnlySelectedShape()
			if (!onlySelectedShape) return
			assertShapeWithUrl(onlySelectedShape)

			if (onlySelectedShape.props.url !== url) {
				editor.updateShapes([
					{ id: onlySelectedShape.id, type: onlySelectedShape.type, props: { url } },
				])
			}
		},
		[editor]
	)

	const handleClear = useCallback(() => {
		const onlySelectedShape = editor.getOnlySelectedShape()
		if (!onlySelectedShape) return
		assertShapeWithUrl(onlySelectedShape)
		editor.updateShapes([
			{ id: onlySelectedShape.id, type: onlySelectedShape.type, props: { url: '' } },
		])
	}, [editor])

	return (
		<LinkDialog
			onClose={onClose}
			initialValue={selectedShape.props.url}
			onComplete={handleComplete}
			onClear={handleClear}
		/>
	)
})

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
	const trackEvent = useUiEvents()

	const shapes = getFormattableSelectedShapes(editor)

	const rInitialValue = useRef(
		shapes.map((shape) => getFirstLinkHref(shape.props.richText)).find(Boolean) ?? ''
	)

	const handleComplete = useCallback(
		(href: string) => {
			const targets = getFormattableSelectedShapes(editor)
			if (targets.length === 0) return

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
		},
		[editor, trackEvent]
	)

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
	}, [editor, trackEvent])

	if (shapes.length === 0) {
		onClose()
		return null
	}

	return (
		<LinkDialog
			onClose={onClose}
			initialValue={rInitialValue.current}
			onComplete={handleComplete}
			onClear={handleClear}
		/>
	)
})
